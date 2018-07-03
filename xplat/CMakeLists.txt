cmake_minimum_required (VERSION 3.6.0)
project(sonarcpp CXX)
set(CMAKE_VERBOSE_MAKEFILE on)
set(PACKAGE_NAME      sonarcpp)
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_EXTENSIONS OFF)

set(third_party_ndk ${PROJECT_SOURCE_DIR}/../android/build/third-party-ndk)
set(libfolly_DIR ${third_party_ndk}/folly/)
set(rsocket_DIR ${third_party_ndk}/RSocket/)
set(easywsclient_DIR ../libs/)
set(glog_DIR ${third_party_ndk}/glog)
set(BOOST_DIR ${third_party_ndk}/boost/boost_1_63_0/)
set(LIBEVENT_DIR ${third_party_ndk}/LibEvent/libevent-release-2.1.9/)
set(DOUBLECONVERSION_DIR ${third_party_ndk}/double-conversion/double-conversion-3.0.0/)
set(OPENSSL_DIR ${third_party_ndk}/OpenSSL/openssl-1.1.0h/)

list(APPEND dir_list ./)
list(APPEND dir_list ./Sonar)

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


file(GLOB SOURCES Sonar/*.cpp)
add_library(${PACKAGE_NAME} SHARED ${SOURCES})

set(build_DIR ${CMAKE_SOURCE_DIR}/build)
set(libfolly_build_DIR ${build_DIR}/libfolly/${ANDROID_ABI})
set(rsocket_build_DIR ${build_DIR}/rsocket/${ANDROID_ABI})

file(MAKE_DIRECTORY ${build_DIR})

#add_subdirectory(${libfolly_DIR} ${libfolly_build_DIR})
add_subdirectory(${rsocket_DIR} ${rsocket_build_DIR})

message(STATUS "RSocket DIR:- " ${rsocket_DIR})

target_include_directories(${PACKAGE_NAME} PRIVATE
        ${libfolly_DIR}
        ${BOOST_DIR}
        ${BOOST_DIR}/../
        ${LIBEVENT_DIR}/
        ${rsocket_DIR}/rsocket-cpp-0.10.1
        ${LIBEVENT_DIR}/include/
        ${LIBEVENT_DIR}/include/event2
        ${OPENSSL_DIR}/include
        ${glog_DIR}
        ${glog_DIR}/../
        ${glog_DIR}/glog-0.3.5/src/
    )

set(OPENSSL_LINK_DIRECTORIES ${third_party_ndk}/OpenSSL/libs/${ANDROID_ABI}/)
find_path(OPENSSL_LIBRARY libssl.so HINTS ${OPENSSL_LINK_DIRECTORIES})

target_link_libraries(${PACKAGE_NAME}  folly rsocket glog double-conversion log event ${OPENSSL_LINK_DIRECTORIES}/libssl.so ${OPENSSL_LINK_DIRECTORIES}/libcrypto.so)
