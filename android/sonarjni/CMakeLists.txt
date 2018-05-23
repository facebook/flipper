cmake_minimum_required (VERSION 3.6.0)
project(sonarjni CXX C)
set(CMAKE_VERBOSE_MAKEFILE on)

set(PACKAGE_NAME      "sonarjni")
#link_directories(../libs/easywsclient/build/)

#include_directories(Sonar)

add_compile_options(-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0
    -std=c++14 -DSONAR_JNI_EXTERNAL=1)

file(GLOB SOURCES "./*.cpp")
add_library(${PACKAGE_NAME} SHARED ${SOURCES})
target_include_directories(${PACKAGE_NAME}  PUBLIC "./")
set(libfolly_DIR ../../libs/folly/)
set(libjnihack_DIR ../../libs/jni-hack/)
set(libfbjni_DIR ../../libs/fbjni/src/main/cpp/include/)
#set(libfbjni_DIR ../../libs/fbjni/src/main/cpp/include/)
set(libsonar_DIR ../../xplat/)


set(build_DIR ${CMAKE_SOURCE_DIR}/build)

set(libfolly_build_DIR ${build_DIR}/libfolly/${ANDROID_ABI})
set(fbjni_build_DIR ${build_DIR}/fbjni/${ANDROID_ABI})
file(MAKE_DIRECTORY ${build_DIR})

target_include_directories(sonarjni PRIVATE
    ${libfolly_DIR}
    ${libjnihack_DIR}
    ${libfbjni_DIR}
    ${libsonar_DIR})

target_link_libraries(sonarjni folly fbjni, sonar)
