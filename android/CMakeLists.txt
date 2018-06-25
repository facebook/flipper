cmake_minimum_required (VERSION 3.6.0)
project(sonar CXX)
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_VERBOSE_MAKEFILE on)

set(PACKAGE_NAME      "sonar")

add_compile_options(-DSONAR_OSS=1
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

file(GLOB SOURCES android/sonar.cpp)
add_library(${PACKAGE_NAME} SHARED ${SOURCES})
target_include_directories(${PACKAGE_NAME}  PUBLIC "./")

set(libjnihack_DIR ${CMAKE_SOURCE_DIR}/../libs/jni-hack/)
set(libfbjni_DIR ${CMAKE_SOURCE_DIR}/../libs/fbjni/)
set(libsonar_DIR ${CMAKE_SOURCE_DIR}/../xplat/)
set(third_party_ndk ${PROJECT_SOURCE_DIR}/build/third-party-ndk)
set(libfolly_DIR ${third_party_ndk}/folly/)
set(glog_DIR ${third_party_ndk}/glog)
set(BOOST_DIR ${third_party_ndk}/boost/boost_1_63_0/)
set(LIBEVENT_DIR ${third_party_ndk}/LibEvent/libevent-release-2.1.9/)

set(build_DIR ${CMAKE_SOURCE_DIR}/build)

set(fbjni_build_DIR ${build_DIR}/fbjni/${ANDROID_ABI})
set(libsonar_build_DIR ${build_DIR}/libsonar/${ANDROID_ABI})
set(libfolly_build_DIR ${build_DIR}/libfolly/${ANDROID_ABI})

file(MAKE_DIRECTORY ${build_DIR})

add_subdirectory(${libsonar_DIR} ${libsonar_build_DIR})
add_subdirectory(${libfbjni_DIR} ${fbjni_build_DIR})

target_include_directories(${PACKAGE_NAME} PRIVATE
    ${libjnihack_DIR}
    ${libfbjni_DIR}/cxx/
    ${libfbjni_DIR}/cxx/fbjni
    ${libfbjni_DIR}/cxx/fbjni/detail
    ${libfbjni_DIR}/cxx/lyra
    ${libsonar_DIR}
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

target_link_libraries(${PACKAGE_NAME} sonarfb sonarcpp)
