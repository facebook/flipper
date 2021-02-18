# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

cmake_minimum_required (VERSION 3.6.0)
project(flipper CXX)
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_VERBOSE_MAKEFILE on)

set(PACKAGE_NAME      "flipper")

add_compile_options(-DFLIPPER_OSS=1
                    -DFOLLY_NO_CONFIG
                    -DSONAR_JNI_EXTERNAL=1
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

file(GLOB SOURCES src/main/cpp/sonar.cpp)
add_library(${PACKAGE_NAME} SHARED ${SOURCES})
target_include_directories(${PACKAGE_NAME}  PUBLIC "./")

set(libjnihack_DIR ${CMAKE_SOURCE_DIR}/../libs/jni-hack/)
set(libflipper_DIR ${CMAKE_SOURCE_DIR}/../xplat/)
set(external_DIR ${PROJECT_SOURCE_DIR}/third-party/external)
set(libfolly_DIR ${external_DIR}/folly/)
set(glog_DIR ${external_DIR}/glog)
set(BOOST_DIR ${external_DIR}/boost/boost_1_63_0/)
set(LIBEVENT_DIR ${external_DIR}/LibEvent/libevent-2.1.11-stable/)

set(build_DIR ${CMAKE_SOURCE_DIR}/build)

set(libflipper_build_DIR ${build_DIR}/libflipper/${ANDROID_ABI})
set(libfolly_build_DIR ${build_DIR}/libfolly/${ANDROID_ABI})

file(MAKE_DIRECTORY ${build_DIR})
file(GLOB libfbjni_link_DIRS "${build_DIR}/fbjni*/jni/${ANDROID_ABI}")
file(GLOB libfbjni_include_DIRS "${build_DIR}/fbjni-*-headers.jar/")

# Without NO_CMAKE_FIND_ROOT_PATH, this will for some bizarre reason only look
# in the NDK folder.
find_library(FBJNI_LIBRARY fbjni PATHS ${libfbjni_link_DIRS} NO_CMAKE_FIND_ROOT_PATH)
find_package(fbjni REQUIRED CONFIG)

add_subdirectory(${libflipper_DIR} ${libflipper_build_DIR})

target_include_directories(${PACKAGE_NAME} PRIVATE
    ${libjnihack_DIR}
    ${libfbjni_include_DIRS}
    ${libflipper_DIR}
    ${libfolly_DIR}
    ${glog_DIR}
    ${glog_DIR}/../
    ${glog_DIR}/glog-0.3.5/src/
    ${BOOST_DIR}
    ${BOOST_DIR}/../
    ${LIBEVENT_DIR}/
    ${LIBEVENT_DIR}/include/
    ${LIBEVENT_DIR}/include/event2
    )

target_link_libraries(${PACKAGE_NAME} fbjni::fbjni flippercpp)
