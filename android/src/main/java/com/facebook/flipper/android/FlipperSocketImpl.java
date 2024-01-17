/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android;

import android.net.TrafficStats;
import android.util.Log;
import com.facebook.flipper.BuildConfig;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperSocket;
import com.facebook.flipper.core.FlipperSocketEventHandler;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.soloader.SoLoader;
import java.io.BufferedInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.net.Socket;
import java.net.URI;
import java.net.URISyntaxException;
import java.security.InvalidAlgorithmParameterException;
import java.security.KeyStore;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertPath;
import java.security.cert.CertPathValidator;
import java.security.cert.CertPathValidatorException;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.PKIXParameters;
import java.security.cert.TrustAnchor;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.concurrent.TimeUnit;
import javax.net.SocketFactory;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.drafts.Draft_6455;
import org.java_websocket.handshake.ServerHandshake;

/** WS Protocol (RFC-6455): https://datatracker.ietf.org/doc/html/rfc6455 */
@DoNotStrip
class FlipperSocketImpl extends WebSocketClient implements FlipperSocket {

  private static final int CERTIFICATE_TTL_DAYS = 30;

  static {
    if (BuildConfig.IS_INTERNAL_BUILD || BuildConfig.LOAD_FLIPPER_EXPLICIT) {
      SoLoader.loadLibrary("flipper");
    }
  }

  FlipperSocketEventHandler mEventHandler;
  boolean mConnected = false;

  FlipperSocketImpl(String url) throws URISyntaxException {
    super(new URI(url), new Draft_6455(), null, 30);
  }

  public void flipperSetEventHandler(FlipperSocketEventHandler eventHandler) {
    this.mEventHandler = eventHandler;
  }

  private void clearEventHandler() {
    this.mEventHandler =
        new FlipperSocketEventHandler() {
          @Override
          public void onConnectionEvent(SocketEvent event, String message) {}

          @Override
          public void onMessageReceived(String message) {}

          @Override
          public FlipperObject onAuthenticationChallengeReceived() {
            return null;
          }
        };
  }

  @Override
  public void flipperConnect() {
    if ((this.isOpen())) {
      return;
    }
    try {
      /**
       * Authentication object, if present, will be used to create a valid SSL context to establish
       * a secure socket connection. If absent, then a connection will be established to perform the
       * certificate exchange.
       */
      FlipperObject authenticationObject = this.mEventHandler.onAuthenticationChallengeReceived();
      SocketFactory socketFactory;
      if (authenticationObject.contains("certificates_client_path")
          && authenticationObject.contains("certificates_client_pass")) {

        SSLContext sslContext = SSLContext.getInstance("TLS");
        KeyStore ks = KeyStore.getInstance("PKCS12");

        String cert_client_path = authenticationObject.getString("certificates_client_path");
        String cert_client_pass = authenticationObject.getString("certificates_client_pass");
        String cert_ca_path = authenticationObject.getString("certificates_ca_path");

        try (InputStream clientCertificateStream = new FileInputStream(cert_client_path)) {
          ks.load(clientCertificateStream, cert_client_pass.toCharArray());
        }

        KeyManagerFactory kmf =
            KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        kmf.init(ks, cert_client_pass.toCharArray());

        sslContext.init(
            kmf.getKeyManagers(), new TrustManager[] {new FlipperTrustManager(cert_ca_path)}, null);

        socketFactory = sslContext.getSocketFactory();
      } else {
        socketFactory = SocketFactory.getDefault();
      }

      this.setSocketFactory(
          new DelegatingSocketFactory(socketFactory) {
            @Override
            protected Socket configureSocket(Socket socket) {
              TrafficStats.setThreadStatsTag(SOCKET_TAG);
              return socket;
            }
          });

      this.connect();
    } catch (Exception e) {
      Log.e("flipper", "Failed to initialize the socket before connect. Error: " + e.getMessage());
      this.mEventHandler.onConnectionEvent(
          FlipperSocketEventHandler.SocketEvent.ERROR, e.getMessage());
    }
  }

  @Override
  protected void onSetSSLParameters(SSLParameters sslParameters) {
    sslParameters.setNeedClientAuth(true);
  }

  @Override
  public void onOpen(ServerHandshake handshakedata) {
    mConnected = true;
    this.mEventHandler.onConnectionEvent(FlipperSocketEventHandler.SocketEvent.OPEN, "");
  }

  @Override
  public void onMessage(String message) {
    this.mEventHandler.onMessageReceived(message);
  }

  @Override
  public void onClose(int code, String reason, boolean remote) {
    // 1000 (normal closure), 1001 (endpoint is "going away"), and 1006
    // (connection was closed abnormally) are valid close codes, we are already connected.
    boolean shouldReport = mConnected;

    // Not a valid WS code as per RFC-6455. Usually found when the endpoint
    // is not running. It can report an error, but can be safely ignored.
    if (code == -1) {
      shouldReport = true;
    }

    // 1002 (endpoint is terminating the connection due to a protocol error).
    // Used whenever the endpoint is rejecting incoming connections.
    // The connection is not open because is terminated prematurely.
    if (code == 1002
        && reason != null
        && reason.contains("Invalid status code received: 401 Status")) {
      shouldReport = true;
    }

    if (shouldReport) {
      this.mEventHandler.onConnectionEvent(FlipperSocketEventHandler.SocketEvent.CLOSE, "");
      // Clear the existing event handler as to ensure no other events are processed after the close
      // is handled.
      this.clearEventHandler();
    }

    mConnected = false;
  }

  /**
   * If no socket factory is set, a javax.net.ssl.SSLHandshakeException will be thrown with message:
   * No subjectAltNanmes on the certificate match. If set, but without a key manager and/or trust
   * manager, the same error will be thrown.
   *
   * @param ex
   */
  @Override
  public void onError(Exception ex) {
    boolean isSSLError = true;
    // Check the exception for SSL error and change the event type.
    // Required for Flipper as the current implementation treats these errors differently.
    if (ex instanceof javax.net.ssl.SSLHandshakeException) {
      Throwable cause = ex.getCause();
      if (cause != null) {
        isSSLError =
            !(cause instanceof java.io.EOFException || cause instanceof java.net.ConnectException);
      }
    } else {
      isSSLError = false;
    }

    this.mEventHandler.onConnectionEvent(
        isSSLError
            ? FlipperSocketEventHandler.SocketEvent.SSL_ERROR
            : FlipperSocketEventHandler.SocketEvent.ERROR,
        ex.getMessage());

    // Clear the existing event handler as to ensure no other events are processed after the close
    // is handled.
    this.clearEventHandler();
  }

  @Override
  public void flipperDisconnect() {
    mConnected = false;

    this.clearEventHandler();
    super.close();
  }

  @Override
  public void flipperSend(String message) {
    this.send(message);
  }

  public class FlipperTrustManager implements X509TrustManager {
    Certificate mCA;

    public FlipperTrustManager(String cert_ca_path) throws Exception {

      CertificateFactory certificateFactory = CertificateFactory.getInstance("X.509");
      InputStream caInputStream = new BufferedInputStream(new FileInputStream(cert_ca_path));

      try {
        mCA = certificateFactory.generateCertificate(caInputStream);
      } finally {
        caInputStream.close();
      }

      if (mCA == null) {
        /** Unable to find a valid CA. */
        throw new Exception("Unable to find a valid trust manager.");
      }
    }

    public void checkClientTrusted(X509Certificate[] chain, String algorithm)
        throws CertificateException {
      throw new CertificateException("No client certificate verification provided");
    }

    public void checkServerTrusted(X509Certificate[] chain, String authType)
        throws CertificateException {
      try {
        checkServerTrustedImpl(chain);
      } catch (Exception e) {
        if (!(e instanceof CertificateException)) {
          e = new CertificateException(e);
        }
        throw (CertificateException) e;
      }
    }

    public void checkServerTrustedImpl(X509Certificate[] chain) throws CertificateException {
      /**
       * If we expect a 2 certs chain (CA + certificate), lets enforce that (allow only 2 certs in
       * the chain) - this would prevent attacks where validators fail to traverse the whole chain
       * and then you can have an invalid chain that still passes the CA validation (it has been a
       * common vulnerability in the past)
       */
      if (chain.length != 2) {
        throw new CertificateException("Certificate chain is invalid. Invalid length");
      }

      final Date now = new Date();
      for (X509Certificate certificate : chain) {
        certificate.checkValidity(now);

        /**
         * Ensure the certificates are considered invalid after a certain period of time, enforced
         * by the mobile client instead of based on cert/CA expiration under desktop control, they
         * are re-used (desktop app generate them and then they are re-used for subsequent
         * connections) the client has a TTL (currently set at 30 days).
         */
        final Date notBefore = certificate.getNotBefore();
        if (notBefore.after(now)) {
          throw new CertificateException("Unable to accept certificate in the chain");
        }

        long diff = now.getTime() - notBefore.getTime();
        long days = TimeUnit.DAYS.convert(diff, TimeUnit.MILLISECONDS);
        if (days < 0 || days > CERTIFICATE_TTL_DAYS) {
          throw new CertificateException("Unable to accept certificate in the chain");
        }
      }

      // Check issued by trusted issuer
      final CertPathValidator certificatePathValidator;
      try {
        certificatePathValidator =
            CertPathValidator.getInstance(CertPathValidator.getDefaultType());
      } catch (NoSuchAlgorithmException e) {
        throw new CertificateException(e);
      }

      CertificateFactory certificateFactory = CertificateFactory.getInstance("X.509");
      CertPath certificatePath = certificateFactory.generateCertPath(Arrays.asList(chain));

      TrustAnchor trustAnchor = new TrustAnchor((X509Certificate) mCA, null);

      final PKIXParameters pkixParameters;
      try {
        pkixParameters = new PKIXParameters(Collections.singleton(trustAnchor));
      } catch (InvalidAlgorithmParameterException e) {
        throw new CertificateException(e);
      }

      pkixParameters.setDate(now);
      /**
       * Note: considering this is a self-signed CA generated by the desktop app and passed back to
       * the android client then revocation should not be a concern.
       */
      pkixParameters.setRevocationEnabled(false);
      try {
        certificatePathValidator.validate(certificatePath, pkixParameters);
      } catch (CertPathValidatorException | InvalidAlgorithmParameterException e) {
        throw new CertificateException(e);
      }
    }

    public X509Certificate[] getAcceptedIssuers() {
      return new X509Certificate[] {(X509Certificate) mCA};
    }
  }
}
