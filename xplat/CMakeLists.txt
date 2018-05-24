cmake_minimum_required (VERSION 3.6.0)
project(sonar CXX C)
set(CMAKE_VERBOSE_MAKEFILE on)

set(PACKAGE_NAME      "sonar")
link_directories(../libs/easywsclient/build/)
#link_directories(/usr/local/lib/)

include_directories(Sonar/)

#-DFOLLY_USE_LIBCPP=1
#-DFOLLY_HAVE_MEMRCHR
#-DFOLLY_HAVE_LIBJEMALLOC=0


#-DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0
#add_compile_options(-DFB_SONARKIT_ENABLED=1 -DFOLLY_HAVE_PTHREAD -DFOLLY_HAVE_PTHREAD_ATFORK -DFOLLY_USE_LIBCPP=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=0 -DFOLLY_HAVE_LIBGFLAGS=1  -frtti
#    -fexceptions
#    -std=c++14
#    -Wno-error
#    -Wno-unused-local-typedefs
#    -Wno-unused-variable
#    -Wno-sign-compare
#    -Wno-comment
#    -Wno-return-type
#    -Wno-global-constructors
#    -Wno-#warnings
#    -Wno-macro-redefined
#    )

    add_compile_options(-DFB_SONARKIT_ENABLED=1 -DFOLLY_HAVE_PTHREAD -DFOLLY_HAVE_PTHREAD_ATFORK -DFOLLY_USE_LIBCPP=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=0 -DFOLLY_HAVE_LIBGFLAGS=1  -frtti
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


file(GLOB SOURCES Sonar/*.cpp)
add_library(${PACKAGE_NAME} SHARED ${SOURCES})
target_include_directories(${PACKAGE_NAME}  PUBLIC "./")
set(libfolly_DIR ../libs/folly/)
set(easywsclient_DIR ../libs/)

#set(OPENSSL_ROOT_DIR /usr/local/opt/openssl)
#set(OPENSSL_INCLUDE_DIR /usr/local/opt/openssl/include/)
#set(OPENSSL_LIBRARIES /usr/local/opt/openssl/lib)
#set(OPENSSL_CRYPTO_LIBRARY /usr/local/opt/openssl/lib)
#set(OPENSSL_SSL_LIBRARY /usr/local/opt/openssl/lib)
#set(LIBGFLAGS_LIBRARY /usr/local/opt/gflags/lib)

set(build_DIR ${CMAKE_SOURCE_DIR}/build)

set(libfolly_build_DIR ${build_DIR}/libfolly/${ANDROID_ABI})
set(easywsclient_build_DIR ${build_DIR}/easywsclient/${ANDROID_ABI})

file(MAKE_DIRECTORY ${build_DIR})

add_subdirectory(${libfolly_DIR} ${libfolly_build_DIR})
add_subdirectory(${easywsclient_DIR}/easywsclient ${easywsclient_build_DIR})

target_include_directories(sonar PRIVATE
    ${libfolly_DIR}
    ${easywsclient_DIR})

target_link_libraries(sonar folly easywsclient)
