cmake_minimum_required (VERSION 3.7.1)
project(sonar CXX C)
set(CMAKE_VERBOSE_MAKEFILE on)

set(PACKAGE_NAME      "sonar")
link_directories(../libs/easywsclient/build/)

include_directories(Sonar)

add_compile_options(-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_HAVE_LIBGFLAGS=0 -DFOLLY_HAVE_LIBJEMALLOC=0 -DFOLLY_HAVE_PREADV=0 -DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0  -frtti
    -fexceptions
    -std=c++14
    -Wno-error
    -Wno-unused-local-typedefs
    -Wno-unused-variable
    -Wno-sign-compare
    -Wno-comment
    -Wno-return-type
    -Wno-global-constructors)

file(GLOB SOURCES "Sonar/*.cpp")
add_library(${PACKAGE_NAME} SHARED ${SOURCES})
target_include_directories(${PACKAGE_NAME}  PUBLIC "./")
set(libfolly_DIR ../libs/folly/)
set(easywsclient_DIR ../libs/)

set(build_DIR ${CMAKE_SOURCE_DIR}/build)

set(libfolly_build_DIR ${build_DIR}/libfolly/${ANDROID_ABI})
set(easywsclient_build_DIR ${build_DIR}/easywsclient/${ANDROID_ABI})
file(MAKE_DIRECTORY ${build_DIR})

target_include_directories(sonar PRIVATE
    ${libfolly_DIR}
    ${easywsclient_DIR})

target_link_libraries(sonar folly easywsclient)
