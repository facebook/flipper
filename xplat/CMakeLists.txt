cmake_minimum_required (VERSION 3.6.0)
project(sonar CXX)
set(CMAKE_VERBOSE_MAKEFILE on)
set(PACKAGE_NAME      sonar)

#-DFOLLY_USE_LIBCPP=1
#-DFOLLY_HAVE_MEMRCHR
#-DFOLLY_HAVE_LIBJEMALLOC=0
#-DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0

set(third_party_ndk ../android/build/third-party-ndk)
set(libfolly_DIR ${third_party_ndk}/folly/)
set(easywsclient_DIR ../libs/)
set(glog_DIR ${third_party_ndk}/glog)
set(BOOST_DIR /usr/local/include/boost/)
set(DOUBLECONVERSION_DIR ${third_party_ndk}/double-conversion/double-conversion-3.0.0/)



#add_compile_options(-DFOLLY_HAVE_MEMRCHR -DFB_SONARKIT_ENABLED=1 -DFOLLY_HAVE_PTHREAD -DFOLLY_HAVE_PTHREAD_ATFORK -DFOLLY_USE_LIBCPP=1 -DFOLLY_NO_CONFIG -DFOLLY_MOBILE=0 -DFOLLY_HAVE_LIBGFLAGS=1  -frtti
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

#      -DFOLLY_NO_CONFIG=1


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
                    -std=c++14
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
set(easywsclient_build_DIR ${build_DIR}/easywsclient/${ANDROID_ABI})

file(MAKE_DIRECTORY ${build_DIR})

add_subdirectory(${libfolly_DIR} ${libfolly_build_DIR})
add_subdirectory(${easywsclient_DIR}/easywsclient ${easywsclient_build_DIR})

message(STATUS "LOG_SEVERITY IS => " ${GLOG_DIR}/glog-0.3.5/src/)
target_include_directories(${PACKAGE_NAME} PRIVATE
        ${libfolly_DIR}
        ${BOOST_DIR}
        ${BOOST_DIR}/../
        ${glog_DIR}
        ${glog_DIR}/../
        ${glog_DIR}/glog-0.3.5/src/
        ${easywsclient_DIR}
    )

install(TARGETS ${PACKAGE_NAME}  DESTINATION ./build/)

target_link_libraries(sonar folly easywsclient glog double-conversion log)
