/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperConnectionEndpointVerifier.h"
#include <stdio.h>

#ifdef _MSC_VER /* MSVC */

#include <winsock2.h>
#include <ws2tcpip.h>
#define getsockopt(a, b, c, d, e) getsockopt(a, b, c, (char*)d, e)
typedef int socklen_t;

#else /* !_WIN32 */

#include <netdb.h>
#include <sys/fcntl.h>
#include <sys/socket.h>
#include <unistd.h>
using SOCKET = int;
#endif

#include <cstring>

namespace facebook {
namespace flipper {

static bool setSocketNonBlocking(SOCKET socket) {
#ifndef _WIN32
  int flags = fcntl(socket, F_GETFL, 0);
  if (flags < 0) {
    return false;
  }
  return (fcntl(socket, F_SETFL, flags | O_NONBLOCK) == 0);
#else
  // If nonBlocking = 0, blocking is enabled;
  // If nonBlocking != 0, non-blocking mode is enabled.
  u_long nonBlocking = 1;
  int32_t nonBlockResult = ioctlsocket(socket, FIONBIO, &nonBlocking);
  if (nonBlockResult != 0) {
    return false;
  } else {
    return true;
  }
#endif
}

static void closeSocket(SOCKET socket) {
#ifndef _WIN32
  close(socket);
#else
  closesocket(socket);
#endif
}

bool ConnectionEndpointVerifier::verify(const std::string& host, int port) {
  auto sport = std::to_string(port);

  struct addrinfo hints;

  memset(&hints, 0, sizeof(hints));
  hints.ai_family = AF_UNSPEC;
  hints.ai_socktype = SOCK_STREAM;
  hints.ai_flags = AI_PASSIVE;
  struct addrinfo* address;
  getaddrinfo(host.c_str(), sport.c_str(), &hints, &address);

  int sfd =
      socket(address->ai_family, address->ai_socktype, address->ai_protocol);

  setSocketNonBlocking(sfd);
  connect(sfd, address->ai_addr, address->ai_addrlen);

  fd_set fdset;
  struct timeval tv;

  FD_ZERO(&fdset);
  FD_SET(sfd, &fdset);
  // Set a timeout of 3 seconds.
  tv.tv_sec = 3;
  tv.tv_usec = 0;

  bool listening = false;
  if (select(sfd + 1, NULL, &fdset, NULL, &tv) == 1) {
    int so_error;
    socklen_t len = sizeof so_error;

    getsockopt(sfd, SOL_SOCKET, SO_ERROR, &so_error, &len);

    if (so_error == 0) {
      listening = true;
    }
    // If there's an error, most likely there is no process
    // listening at the specified host/port (ECONNREFUSED).
  }

  freeaddrinfo(address);
  closeSocket(sfd);

  return listening;
}

} // namespace flipper
} // namespace facebook
