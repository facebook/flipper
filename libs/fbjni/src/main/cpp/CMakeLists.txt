#
# Copyright (c) 2014-present, Facebook, Inc.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

cmake_minimum_required(VERSION 3.6.0)

set(CMAKE_VERBOSE_MAKEFILE on)

add_compile_options(
    -fno-omit-frame-pointer
    -fexceptions
    -Wall
    -std=c++11
    -DDISABLE_CPUCAP
    -DDISABLE_XPLAT)

file(GLOB fb_SRC
    *.cpp
    jni/*.cpp
    lyra/*.cpp)

set(libjnihack_DIR  ../../../../jni-hack/)

add_library(fb STATIC
    ${fb_SRC})

target_include_directories(fb PRIVATE
    include ${libjnihack_DIR})

target_link_libraries(fb log)
