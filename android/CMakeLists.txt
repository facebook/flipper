cmake_minimum_required (VERSION 3.6.0)
project(sonarjni CXX C)
set(CMAKE_VERBOSE_MAKEFILE on)

set(PACKAGE_NAME      "sonarjni")
link_directories(/usr/local/lib/)
link_directories(../libs/fbjni/src/main/cpp/build/)
link_directories(../xplat/build/)


# -DFOLLY_HAVE_MEMRCHR=1
#add_compile_options(-DSONAR_JNI_EXTERNAL=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0  -frtti
#    -fexceptions
#    -std=c++14
#    -Wno-error
#    -Wno-unused-local-typedefs
#    -Wno-unused-variable
#    -Wno-sign-compare
#    -Wno-comment
#    -Wno-return-type
#    -Wno-global-constructors)

add_compile_options(-DSONAR_JNI_EXTERNAL=1 -DFOLLY_OPENSSL_HAS_SNI=1 -DFOLLY_HAVE_PTHREAD -DFOLLY_HAVE_PTHREAD_ATFORK -DFOLLY_USE_LIBCPP=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=0 -DFOLLY_HAVE_LIBGFLAGS=1  -frtti
    -fexceptions
    -std=c++14
    -Wno-error
    -Wno-unused-local-typedefs
    -Wno-unused-variable
    -Wno-sign-compare
    -Wno-comment
    -Wno-return-type
    -Wno-global-constructors
    -Wno-#warnings
    -Wno-macro-redefined
    )

file(GLOB SOURCES "android/*.cpp")
add_library(${PACKAGE_NAME} SHARED ${SOURCES})
target_include_directories(${PACKAGE_NAME}  PUBLIC "./")
set(libfolly_DIR ../libs/folly/)
set(libjnihack_DIR ../libs/jni-hack/)
set(libfbjni_DIR ../libs/fbjni/src/main/cpp/include/)
set(libsonar_DIR ../xplat/)

set(OPENSSL_ROOT_DIR /usr/local/Cellar/openssl/1.0.2o_1)
set(OPENSSL_INCLUDE_DIR /usr/local/Cellar/openssl/1.0.2o_1/include)

#set(LIBGFLAGS_LIBRARY /usr/local/lib/)
#set(LIBGFLAGS_INCLUDE_DIR /usr/local/include/gflags)
#set(LIBGLOG_LIBRARY /usr/local/lib/)
#set(LIBGLOG_INCLUDE_DIR /usr/local/include/glog)
#set(DOUBLE_CONVERSION_LIBRARY /usr/local/lib/)
#set(DOUBLE_CONVERSION_INCLUDE_DIR /usr/local/include/double-conversion)
#set(LIBEVENT_LIBRARY /usr/local/lib/)
#set(DOUBLE_CONVERSION_INCLUDE_DIR /usr/local/include/double-conversion)

link_directories(${OPENSSL_ROOT_DIR}/lib)

set(build_DIR ${CMAKE_SOURCE_DIR}/build)

set(libfolly_build_DIR ${build_DIR}/libfolly/${ANDROID_ABI})
set(fbjni_build_DIR ${build_DIR}/fbjni/${ANDROID_ABI})
set(libsonar_build_DIR ${build_DIR}/libsonar/${ANDROID_ABI})

file(MAKE_DIRECTORY ${build_DIR})
#set(libglog_DIR /usr/local/include/)

#add_subdirectory(${libfolly_DIR} ${libfolly_build_DIR})
add_subdirectory(${libsonar_DIR} ${libsonar_build_DIR})
add_subdirectory(${libfbjni_DIR}/../ ${fbjni_build_DIR})

#    ${libglog_DIR}
#    ${libfolly_DIR}
target_include_directories(sonarjni PRIVATE
    ${libjnihack_DIR}
    ${libfbjni_DIR}
    ${libsonar_DIR}
    )

target_link_libraries(sonarjni folly fb sonar ssl crypto)
