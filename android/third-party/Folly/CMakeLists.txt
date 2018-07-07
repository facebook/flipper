cmake_minimum_required (VERSION 3.6.0)

PROJECT(folly CXX)
enable_language(CXX)
set(PACKAGE_NAME      folly)
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_EXTENSIONS OFF)

set(FOLLY_DIR ${PROJECT_SOURCE_DIR}/folly)

list(APPEND dir_list ./)
list(APPEND dir_list ${FOLLY_DIR}/lang)
list(APPEND dir_list ${FOLLY_DIR}/hash/)
list(APPEND dir_list ${FOLLY_DIR}/detail)
list(APPEND dir_list ${FOLLY_DIR}/memory/detail)

set(BOOST_DIR ../boost/boost_1_63_0/)
set(GLOG_DIR ../glog/)
set(OPENSSL_DIR ../OpenSSL/openssl-1.1.0h/)
set(LIBEVENT_DIR ../LibEvent/libevent-release-2.1.9/)
set(DOUBLECONVERSION_DIR ../double-conversion/double-conversion-3.0.0/)

list(APPEND dir_list ${BOOST_DIR})
list(APPEND dir_list ${BOOST_DIR}/../)
list(APPEND dir_list ${LIBEVENT_DIR}/)
list(APPEND dir_list ${LIBEVENT_DIR}/include/)
list(APPEND dir_list ${OPENSSL_DIR}/include/)

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

if (CMAKE_ANDROID_ARCH_ABI STREQUAL "x86_64")
    add_compile_options(-mpclmul)
endif()

 file(GLOB SRC_FILES ${FOLLY_DIR}/portability/*.cpp
                     ${FOLLY_DIR}/io/async/ssl/*.cpp
                     ${FOLLY_DIR}/io/async/*.cpp
                     ${FOLLY_DIR}/detail/*.cpp
                     ${FOLLY_DIR}/synchronization/*.cpp
                     ${FOLLY_DIR}/lang/*.cpp
                     ${FOLLY_DIR}/hash/*.cpp
                     ${FOLLY_DIR}/hash/detail/*.cpp
                     ${FOLLY_DIR}/memory/*.cpp
                     ${FOLLY_DIR}/futures/*.cpp
                     ${FOLLY_DIR}/futures/detail/*.cpp
                     ${FOLLY_DIR}/experimental/hazptr/*.cpp
                     ${FOLLY_DIR}/executors/*.cpp
                     ${FOLLY_DIR}/concurrency/*.cpp
                     ${FOLLY_DIR}/ssl/*.cpp
                     ${FOLLY_DIR}/ssl/detail/*.cpp
                     )
list(APPEND SRC_FILES ${FOLLY_DIR}/io/async/HHWheelTimer.cpp
                      ${FOLLY_DIR}/io/async/AsyncPipe.cpp
                      ${FOLLY_DIR}/io/async/AsyncTimeout.cpp
                      ${FOLLY_DIR}/io/async/EventBaseManager.cpp
                      ${FOLLY_DIR}/io/async/TimeoutManager.cpp
                      ${FOLLY_DIR}/io/async/AsyncSocketException.cpp
                      ${FOLLY_DIR}/io/async/Request.cpp
                      ${FOLLY_DIR}/io/async/EventBase.cpp
                      ${FOLLY_DIR}/io/async/EventHandler.cpp
                      ${FOLLY_DIR}/io/async/VirtualEventBase.cpp
                      ${FOLLY_DIR}/io/ShutdownSocketSet.cpp
                      ${FOLLY_DIR}/SharedMutex.cpp
                      ${FOLLY_DIR}/ExceptionWrapper.cpp
                      ${FOLLY_DIR}/system/ThreadName.cpp
                      ${FOLLY_DIR}/io/IOBuf.cpp
                      ${FOLLY_DIR}/io/IOBufQueue.cpp
                      ${FOLLY_DIR}/File.cpp
                      ${FOLLY_DIR}/Random.cpp
                      ${FOLLY_DIR}/Singleton.cpp
                      ${FOLLY_DIR}/IPAddress.cpp
                      ${FOLLY_DIR}/IPAddressV4.cpp
                      ${FOLLY_DIR}/IPAddressV6.cpp
                      ${FOLLY_DIR}/MacAddress.cpp
                      ${FOLLY_DIR}/SocketAddress.cpp
                      ${FOLLY_DIR}/Executor.cpp
                      ${FOLLY_DIR}/FileUtil.cpp
                      ${FOLLY_DIR}/lang/ColdClass.cpp
                      ${FOLLY_DIR}/lang/Assume.cpp
                      ${FOLLY_DIR}/json.cpp
                      ${FOLLY_DIR}/Unicode.cpp
                      ${FOLLY_DIR}/Conv.cpp
                      ${FOLLY_DIR}/Demangle.cpp
                      ${FOLLY_DIR}/memory/detail/MallocImpl.cpp
                      ${FOLLY_DIR}/String.cpp
                      ${FOLLY_DIR}/dynamic.cpp
                      ${FOLLY_DIR}/ScopeGuard.cpp
                      ${FOLLY_DIR}/json_pointer.cpp
                      ${FOLLY_DIR}/FormatArg.cpp
                      ${FOLLY_DIR}/Format.cpp
                      ${FOLLY_DIR}/memory/detail/MallocImpl.cpp
                      )

add_library(${PACKAGE_NAME} SHARED ${SRC_FILES})

set(build_DIR ${CMAKE_SOURCE_DIR}/build)

set(libglog_build_DIR ${build_DIR}/libglog/${ANDROID_ABI})
set(doubleconversion_build_DIR ${build_DIR}/doubleconversion/${ANDROID_ABI})
set(libevent_build_DIR ${build_DIR}/libevent/${ANDROID_ABI})


file(MAKE_DIRECTORY ${build_DIR})

add_subdirectory(${GLOG_DIR} ${libglog_build_DIR})
add_subdirectory(${DOUBLECONVERSION_DIR} ${doubleconversion_build_DIR})
add_subdirectory(${LIBEVENT_DIR} ${libevent_build_DIR})
target_include_directories(${PACKAGE_NAME} PRIVATE
    ${OPENSSL_DIR}/include/
    ${BOOST_DIR}
    ${BOOST_DIR}/../
    ${GLOG_DIR}/../
    ${GLOG_DIR}/glog-0.3.5/src/
    ${DOUBLECONVERSION_DIR})


set(OPENSSL_LINK_DIRECTORIES ${PROJECT_SOURCE_DIR}/../OpenSSL/libs/${ANDROID_ABI}/)
find_path(OPENSSL_LIBRARY libssl.so HINTS ${OPENSSL_LINK_DIRECTORIES})

install(TARGETS ${PACKAGE_NAME}  DESTINATION ./build/)

target_link_libraries(${PACKAGE_NAME} glog double-conversion ${OPENSSL_LINK_DIRECTORIES}/libssl.so ${OPENSSL_LINK_DIRECTORIES}/libcrypto.so event event_extra event_core)
