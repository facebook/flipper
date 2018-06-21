#
# Copyright (c) 2014-present, Facebook, Inc.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

cmake_minimum_required(VERSION 3.6.0)
set(PACKAGE_NAME      "sonarfb")
project(${PACKAGE_NAME} CXX)

set(CMAKE_VERBOSE_MAKEFILE on)

add_compile_options(
    -fno-omit-frame-pointer
    -fexceptions
    -O3
    -Wall
    -std=c++11
    -frtti
    -ffunction-sections
    -DDISABLE_CPUCAP
    -DDISABLE_XPLAT)

set(FBJNI_CXX ${PROJECT_SOURCE_DIR}/cxx)

list(APPEND FBJNI_HDRS ${FBJNI_CXX})
list(APPEND FBJNI_HDRS ${FBJNI_CXX}/fbjni/)
list(APPEND FBJNI_HDRS ${FBJNI_CXX}/fbjni/detail)
list(APPEND FBJNI_HDRS ${FBJNI_CXX}/lyra)
list(APPEND FBJNI_HDRS ${FBJNI_CXX}/../../jni-hack)

include_directories(${FBJNI_HDRS})

file(GLOB FBJNI_SRC
    ${FBJNI_CXX}/fbjni/*.cpp
    ${FBJNI_CXX}/fbjni/detail/*.cpp
    ${FBJNI_CXX}/lyra/*.cpp
    )

add_library(${PACKAGE_NAME} SHARED
    ${FBJNI_SRC})

target_include_directories(${PACKAGE_NAME} PRIVATE ${FBJNI_HDRS})

target_link_libraries(${PACKAGE_NAME} android log)
