cmake_minimum_required (VERSION 3.6.0)

PROJECT(rsocket CXX)
set(PACKAGE_NAME      rsocket)
set(RSOCKET_VERSION 0.10.7)
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_EXTENSIONS OFF)

set(third_party_ndk ${PROJECT_SOURCE_DIR}/../)
set(libfolly_DIR ${third_party_ndk}/folly/)
set(glog_DIR ${third_party_ndk}/glog)
set(BOOST_DIR ${third_party_ndk}/boost/boost_1_63_0/)
set(LIBEVENT_DIR ${third_party_ndk}/LibEvent/libevent-2.1.11-stable/)
set(DOUBLECONVERSION_DIR ${third_party_ndk}/double-conversion/double-conversion-3.0.0/)
set(OPENSSL_DIR ${third_party_ndk}/OpenSSL/openssl-1.1.0h/)

set(RSOCKET_ROOT_DIR  ${PROJECT_SOURCE_DIR}/rsocket-cpp-${RSOCKET_VERSION})
set(RSOCKET_DIR  ${PROJECT_SOURCE_DIR}/rsocket-cpp-${RSOCKET_VERSION}/rsocket)

list(APPEND dir_list ${RSOCKET_ROOT_DIR}/)
list(APPEND dir_list ${RSOCKET_DIR}/)
list(APPEND dir_list ${RSOCKET_DIR}/framing)
list(APPEND dir_list ${RSOCKET_DIR}/internal)
list(APPEND dir_list ${RSOCKET_DIR}/statemachine)
list(APPEND dir_list ${RSOCKET_DIR}/transports)
list(APPEND dir_list ${RSOCKET_DIR}/transports/tcp)
list(APPEND dir_list ${RSOCKET_ROOT_DIR}/yarpl/flowable)
list(APPEND dir_list ${RSOCKET_ROOT_DIR}/yarpl/observable)
list(APPEND dir_list ${RSOCKET_ROOT_DIR}/yarpl/utils)

file(GLOB SRC_FILES ${RSOCKET_DIR}/*.cpp
                    ${RSOCKET_DIR}/internal/*.cpp
                    ${RSOCKET_DIR}/framing/*.cpp
                    ${RSOCKET_DIR}/statemachine/*.cpp
                    ${RSOCKET_DIR}/transports/*.cpp
                    ${RSOCKET_DIR}/transports/tcp/*.cpp
                    ${RSOCKET_ROOT_DIR}/yarpl/observable/*.cpp
                    ${RSOCKET_ROOT_DIR}/yarpl/flowable/*.cpp
                    ${RSOCKET_ROOT_DIR}/yarpl/utils/*.cpp
                    )

include_directories(${dir_list})

add_compile_options(
    -DFOLLY_HAVE_CLOCK_GETTIME=1
    -DFOLLY_HAVE_PTHREAD=1
    -DFOLLY_NO_CONFIG=1
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

add_library(${PACKAGE_NAME} STATIC ${SRC_FILES})

set(build_DIR ${CMAKE_SOURCE_DIR}/build)
set(libfolly_build_DIR ${build_DIR}/libfolly/${ANDROID_ABI})

file(MAKE_DIRECTORY ${build_DIR})

add_subdirectory(${libfolly_DIR} ${libfolly_build_DIR})

target_include_directories(${PACKAGE_NAME} PRIVATE
        ${libfolly_DIR}
        ${BOOST_DIR}
        ${BOOST_DIR}/../
        ${LIBEVENT_DIR}/
        ${LIBEVENT_DIR}/include/
        ${LIBEVENT_DIR}/include/event2
        ${OPENSSL_DIR}/include/
        ${glog_DIR}
        ${glog_DIR}/../
        ${glog_DIR}/glog-0.3.5/src/
    )


set(OPENSSL_LINK_DIRECTORIES ${third_party_ndk}/OpenSSL/libs/${ANDROID_ABI}/)

find_path(OPENSSL_LIBRARY libssl.a HINTS ${OPENSSL_LINK_DIRECTORIES})

target_link_libraries(${PACKAGE_NAME}  folly glog double-conversion log event ${OPENSSL_LINK_DIRECTORIES}/libssl.a ${OPENSSL_LINK_DIRECTORIES}/libcrypto.a)
