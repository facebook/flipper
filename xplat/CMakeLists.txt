# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

cmake_minimum_required (VERSION 3.6.0)
project(flippercpp CXX)
set(CMAKE_VERBOSE_MAKEFILE on)
set(PACKAGE_NAME      flippercpp)
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_EXTENSIONS OFF)
set(RSOCKET_VERSION 0.10.7)
set(external_DIR ${PROJECT_SOURCE_DIR}/../android/third-party/external)
set(libfolly_DIR ${external_DIR}/folly/)
set(rsocket_DIR ${external_DIR}/RSocket/)
set(glog_DIR ${external_DIR}/glog)
set(BOOST_DIR ${external_DIR}/boost/boost_1_63_0/)
set(LIBEVENT_DIR ${external_DIR}/LibEvent/libevent-2.1.11-stable/)
set(DOUBLECONVERSION_DIR ${external_DIR}/double-conversion/double-conversion-3.0.0/)
set(OPENSSL_DIR ${external_DIR}/OpenSSL/openssl-1.1.0h/)

list(APPEND dir_list ./)
list(APPEND dir_list ./Flipper)

include_directories(${dir_list})

add_compile_options(-DFOLLY_NO_CONFIG
                    -DFB_SONARKIT_ENABLED=1
                    -DFOLLY_HAVE_MEMRCHR
                    -DFOLLY_MOBILE=1
                    -DFOLLY_USE_LIBCPP=1
                    -DFOLLY_HAVE_LIBJEMALLOC=0
                    -DFOLLY_HAVE_PREADV=0
                    -frtti
                    -fexceptions
                    -Wno-error
                    -Wno-unused-local-typedefs
                    -Wno-unused-variable
                    -Wno-sign-compare
                    -Wno-comment
                    -Wno-return-type
                    -Wno-tautological-constant-compare
                    )


file(GLOB SOURCES Flipper/*.cpp)
add_library(${PACKAGE_NAME} STATIC ${SOURCES})

set(build_DIR ${CMAKE_SOURCE_DIR}/build)
set(libfolly_build_DIR ${build_DIR}/libfolly/${ANDROID_ABI})
set(rsocket_build_DIR ${build_DIR}/rsocket/${ANDROID_ABI})

file(MAKE_DIRECTORY ${build_DIR})

add_subdirectory(${rsocket_DIR} ${rsocket_build_DIR})

message(STATUS "RSocket DIR:- " ${rsocket_DIR})

target_include_directories(${PACKAGE_NAME} PRIVATE
        ${libfolly_DIR}
        ${BOOST_DIR}
        ${BOOST_DIR}/../
        ${LIBEVENT_DIR}/
        ${rsocket_DIR}/rsocket-cpp-${RSOCKET_VERSION}
        ${LIBEVENT_DIR}/include/
        ${LIBEVENT_DIR}/include/event2
        ${OPENSSL_DIR}/include
        ${glog_DIR}
        ${glog_DIR}/../
        ${glog_DIR}/glog-0.3.5/src/
    )

set(OPENSSL_LINK_DIRECTORIES ${external_DIR}/OpenSSL/libs/${ANDROID_ABI}/)
find_path(OPENSSL_LIBRARY libssl.a HINTS ${OPENSSL_LINK_DIRECTORIES})

target_link_libraries(${PACKAGE_NAME} folly rsocket glog double-conversion log event ${OPENSSL_LINK_DIRECTORIES}/libssl.a ${OPENSSL_LINK_DIRECTORIES}/libcrypto.a)
