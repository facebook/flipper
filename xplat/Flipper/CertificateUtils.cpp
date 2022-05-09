/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "CertificateUtils.h"

#include <fcntl.h>
#include <folly/portability/Fcntl.h>
#include <folly/portability/SysStat.h>
#include <openssl/bio.h>
#include <openssl/err.h>
#include <openssl/pem.h>
#include <openssl/pkcs12.h>
#include <openssl/rsa.h>
#include <openssl/x509.h>
#include <stdio.h>
#include <cstring>
#include <stdexcept>

namespace facebook {
namespace flipper {

BIO* bioFromFile(const char* filename);
bool bioToFile(const char* filename, BIO* bio);

void generateCertSigningRequest_free(
    EVP_PKEY* pKey,
    X509_REQ* x509_req,
    BIGNUM* bne,
    BIO* privateKey,
    BIO* csrBio);

void generateCertPKCS12_free(
    X509* cacert,
    X509* cert,
    EVP_PKEY* pKey,
    STACK_OF(X509) * cacertstack,
    PKCS12* pkcs12bundle);

BIO* bioFromFile(const char* filename) {
  if (filename == nullptr) {
    return nullptr;
  }

  FILE* fp = fopen(filename, "rb");
  if (fp == nullptr) {
    return nullptr;
  }

  BIO* bio = BIO_new(BIO_s_mem());
#define BUFFER_SIZE 512
  char buffer[BUFFER_SIZE];
  size_t r = 0;

  while ((r = fread(buffer, 1, BUFFER_SIZE, fp)) > 0) {
    BIO_write(bio, buffer, (int)r);
  }

  fclose(fp);
  return bio;
}

bool bioToFile(const char* filename, BIO* bio) {
  if (bio == nullptr || filename == nullptr) {
    return false;
  }

  FILE* fp = fopen(filename, "wb");
  if (fp == nullptr) {
    return false;
  }

  BUF_MEM* bptr;
  BIO_get_mem_ptr(bio, &bptr);

  if (bptr != nullptr) {
    fwrite(bptr->data, 1, bptr->length, fp);
  }

  fclose(fp);
  return true;
}

bool generateCertSigningRequest(
    const char* appId,
    const char* csrFile,
    const char* privateKeyFile) {
  int ret = 0;
  BIGNUM* bne = NULL;

  int nVersion = 1;
  int bits = 2048;

  // Using 65537 as exponent
  unsigned long e = RSA_F4;

  X509_NAME* x509_name = NULL;

  const char* subjectCountry = "US";
  const char* subjectProvince = "CA";
  const char* subjectCity = "Menlo Park";
  const char* subjectOrganization = "Flipper";
  const char* subjectCommon = strlen(appId) >= 64 ? "com.flipper" : appId;

  X509_REQ* x509_req = X509_REQ_new();
  EVP_PKEY* pKey = EVP_PKEY_new();
  RSA* rsa = RSA_new();
  BIO* privateKey = NULL;
  BIO* csrBio = NULL;

  EVP_PKEY_assign(pKey, EVP_PKEY_RSA, rsa);

  // Generate rsa key
  bne = BN_new();
  BN_set_flags(bne, BN_FLG_CONSTTIME);
  ret = BN_set_word(bne, e);
  if (ret != 1) {
    generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
    return false;
  }

  ret = RSA_generate_key_ex(rsa, bits, bne, NULL);
  if (ret != 1) {
    generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
    return false;
  }

  {
    privateKey = BIO_new(BIO_s_mem());
    ret =
        PEM_write_bio_RSAPrivateKey(privateKey, rsa, NULL, NULL, 0, NULL, NULL);
    if (ret != 1) {
      generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
      return false;
    }

    if (!bioToFile(privateKeyFile, privateKey)) {
      generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
      return false;
    }
  }

  rsa = NULL;

  ret = BIO_flush(privateKey);
  if (ret != 1) {
    generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
    return ret;
  }

  ret = X509_REQ_set_version(x509_req, nVersion);
  if (ret != 1) {
    generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
    return ret;
  }

  x509_name = X509_REQ_get_subject_name(x509_req);

  ret = X509_NAME_add_entry_by_txt(
      x509_name,
      "C",
      MBSTRING_ASC,
      (const unsigned char*)subjectCountry,
      -1,
      -1,
      0);
  if (ret != 1) {
    generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
    return ret;
  }

  ret = X509_NAME_add_entry_by_txt(
      x509_name,
      "ST",
      MBSTRING_ASC,
      (const unsigned char*)subjectProvince,
      -1,
      -1,
      0);
  if (ret != 1) {
    generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
    return ret;
  }

  ret = X509_NAME_add_entry_by_txt(
      x509_name,
      "L",
      MBSTRING_ASC,
      (const unsigned char*)subjectCity,
      -1,
      -1,
      0);
  if (ret != 1) {
    generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
    return ret;
  }

  ret = X509_NAME_add_entry_by_txt(
      x509_name,
      "O",
      MBSTRING_ASC,
      (const unsigned char*)subjectOrganization,
      -1,
      -1,
      0);
  if (ret != 1) {
    generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
    return ret;
  }

  ret = X509_NAME_add_entry_by_txt(
      x509_name,
      "CN",
      MBSTRING_ASC,
      (const unsigned char*)subjectCommon,
      -1,
      -1,
      0);
  if (ret != 1) {
    generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
    return ret;
  }

  ret = X509_REQ_set_pubkey(x509_req, pKey);
  if (ret != 1) {
    generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
    return ret;
  }

  ret = X509_REQ_sign(
      x509_req, pKey, EVP_sha256()); // returns x509_req->signature->length
  if (ret <= 0) {
    generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
    return ret;
  }

  {
    // Write CSR to a file
    csrBio = BIO_new(BIO_s_mem());

    ret = PEM_write_bio_X509_REQ(csrBio, x509_req);
    if (ret != 1) {
      generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
      return ret;
    }

    if (!bioToFile(csrFile, csrBio)) {
      generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
      return false;
    }
  }

  ret = BIO_flush(csrBio);

  generateCertSigningRequest_free(pKey, x509_req, bne, privateKey, csrBio);
  return (ret == 1);
}

void generateCertSigningRequest_free(
    EVP_PKEY* pKey,
    X509_REQ* x509_req,
    BIGNUM* bne,
    BIO* privateKey,
    BIO* csrBio) {
  BN_free(bne);
  X509_REQ_free(x509_req);
  EVP_PKEY_free(pKey);
  BIO_free_all(privateKey);
  BIO_free_all(csrBio);
}

bool generateCertPKCS12(
    const char* cacertFilepath,
    const char* certFilepath,
    const char* keyFilepath,
    const char* pkcs12Filepath,
    const char* pkcs12Name,
    const char* pkcs12Password) {
  X509 *cert = NULL, *cacert = NULL;
  STACK_OF(X509)* cacertstack = NULL;
  PKCS12* pkcs12bundle = NULL;
  EVP_PKEY* cert_privkey = NULL;
  int bytes = 0;

  OpenSSL_add_all_algorithms();
  ERR_load_crypto_strings();

  // Load the certificate's private key
  if ((cert_privkey = EVP_PKEY_new()) == NULL) {
    return false;
  }

  BIO* privateKeyBio = bioFromFile(keyFilepath);
  if (privateKeyBio == nullptr) {
    generateCertPKCS12_free(
        cacert, cert, cert_privkey, cacertstack, pkcs12bundle);
    return false;
  }

  if (!(cert_privkey =
            PEM_read_bio_PrivateKey(privateKeyBio, NULL, NULL, NULL))) {
    generateCertPKCS12_free(
        cacert, cert, cert_privkey, cacertstack, pkcs12bundle);
    return false;
  }

  // Load the certificate
  BIO* certificateBio = bioFromFile(certFilepath);
  if (certificateBio == nullptr) {
    generateCertPKCS12_free(
        cacert, cert, cert_privkey, cacertstack, pkcs12bundle);
    return false;
  }

  if (!(cert = PEM_read_bio_X509(certificateBio, NULL, NULL, NULL))) {
    generateCertPKCS12_free(
        cacert, cert, cert_privkey, cacertstack, pkcs12bundle);
    return false;
  }

  // Load the CA certificate who signed it
  BIO* cacertBio = bioFromFile(cacertFilepath);
  if (cacertBio == nullptr) {
    generateCertPKCS12_free(
        cacert, cert, cert_privkey, cacertstack, pkcs12bundle);
    return false;
  }

  if (!(cacert = PEM_read_bio_X509(cacertBio, NULL, NULL, NULL))) {
    generateCertPKCS12_free(
        cacert, cert, cert_privkey, cacertstack, pkcs12bundle);
    return false;
  }

  // Load the CA certificate on the stack
  if ((cacertstack = sk_X509_new_null()) == NULL) {
    generateCertPKCS12_free(
        cacert, cert, cert_privkey, cacertstack, pkcs12bundle);
    return false;
  }

  sk_X509_push(cacertstack, cacert);

  // Create the PKCS12 structure and fill it with our data
  if ((pkcs12bundle = PKCS12_new()) == NULL) {
    generateCertPKCS12_free(
        cacert, cert, cert_privkey, cacertstack, pkcs12bundle);
    return false;
  }

  // Values of zero use the openssl default values
  pkcs12bundle = PKCS12_create(
      const_cast<char*>(pkcs12Password), // certbundle access password
      const_cast<char*>(pkcs12Name), // friendly certificate name
      cert_privkey, // the certificate private key
      cert, // the main certificate
      cacertstack, // stack of CA cert chain
      0, // int nid_key (default 3DES)
      0, // int nid_cert (40bitRC2)
      0, // int iter (default 2048)
      0, // int mac_iter (default 1)
      0 // int keytype (default no flag)
  );

  if (pkcs12bundle == nullptr) {
    generateCertPKCS12_free(
        cacert, cert, cert_privkey, cacertstack, pkcs12bundle);
    return false;
  }

  // Write the PKCS12 structure out to file
  BIO* pkcs12Bio = BIO_new(BIO_s_mem());
  bytes = i2d_PKCS12_bio(pkcs12Bio, pkcs12bundle);
  if (bytes <= 0) {
    generateCertPKCS12_free(
        cacert, cert, cert_privkey, cacertstack, pkcs12bundle);
    return false;
  }

  if (!bioToFile(pkcs12Filepath, pkcs12Bio)) {
    BIO_free(pkcs12Bio);
    generateCertPKCS12_free(
        cacert, cert, cert_privkey, cacertstack, pkcs12bundle);
    return false;
  }

  // Done, free resources
  BIO_free(pkcs12Bio);
  generateCertPKCS12_free(
      cacert, cert, cert_privkey, cacertstack, pkcs12bundle);

  return true;
}

void generateCertPKCS12_free(
    X509* cacert,
    X509* cert,
    EVP_PKEY* pKey,
    STACK_OF(X509) * cacertstack,
    PKCS12* pkcs12bundle) {
  X509_free(cacert);
  X509_free(cert);
  EVP_PKEY_free(pKey);
  sk_X509_free(cacertstack);
  PKCS12_free(pkcs12bundle);
}

} // namespace flipper
} // namespace facebook
