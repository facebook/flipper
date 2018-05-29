cmake_minimum_required (VERSION 3.6.0)

PROJECT(folly CXX)
enable_language(CXX)
set(PACKAGE_NAME      folly)

set(FOLLY_DIR ${PROJECT_SOURCE_DIR}/folly)


list(APPEND dir_list ./)
list(APPEND dir_list ${FOLLY_DIR}/lang)
list(APPEND dir_list ${FOLLY_DIR}/hash/)
list(APPEND dir_list ${FOLLY_DIR}/detail)
list(APPEND dir_list ${FOLLY_DIR}/memory/detail)

set(BOOST_DIR ../boost/boost_1_63_0/)
#set(BOOST_DIR /usr/local/include/boost/)
set(GLOG_DIR ../glog/)
set(DOUBLECONVERSION_DIR ../double-conversion/double-conversion-3.0.0/)

list(APPEND dir_list ${BOOST_DIR})

list(APPEND dir_list ${BOOST_DIR}/../)
#list(APPEND dir_list ${GLOG_DIR}/../)
#list(APPEND dir_list ${GLOG_DIR}/glog-0.3.5/src/)
#list(APPEND dir_list ${DOUBLECONVERSION_DIR})


file(GLOB_RECURSE DIR_LIST ${FOLLY_DIR})

include_directories(${dir_list})
#-DFOLLY_HAVE_PWRITEV=0 -DFOLLY_HAVE_TFO=0 -DFOLLY_USE_SYMBOLIZER=0     -DFOLLY_HAVE_LIBGFLAGS=0     -DFOLLY_NO_CONFIG=1


  add_compile_options(
    -DFOLLY_NO_CONFIG=1
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

list(APPEND SRC_FILES ${FOLLY_DIR}/Executor.cpp
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
                      )

#file(GLOB_RECURSE SRC_FILES ${FOLLY_DIR}/*.cpp)

#list(REMOVE_ITEM SRC_FILES ${FOLLY_DIR}/build/GenerateFingerprintTables.cpp)
#list(REMOVE_ITEM SRC_FILES ${FOLLY_DIR}/Subprocess.cpp)

message(STATUS "src files => " ${SRC_FILES} )
#message(STATUS "want to remove this => " ${FOLLY_DIR}/build/GenerateFingerprintTables.cpp )

add_library(${PACKAGE_NAME} SHARED ${SRC_FILES})

set(build_DIR ${CMAKE_SOURCE_DIR}/build)

set(libglog_build_DIR ${build_DIR}/libglog/${ANDROID_ABI})
set(doubleconversion_build_DIR ${build_DIR}/doubleconversion/${ANDROID_ABI})

file(MAKE_DIRECTORY ${build_DIR})

add_subdirectory(${GLOG_DIR} ${libglog_build_DIR})
add_subdirectory(${DOUBLECONVERSION_DIR} ${doubleconversion_build_DIR})

target_include_directories(${PACKAGE_NAME} PRIVATE
    ${BOOST_DIR}
    ${BOOST_DIR}/../
    ${GLOG_DIR}/../
    ${GLOG_DIR}/glog-0.3.5/src/
    ${DOUBLECONVERSION_DIR})


install(TARGETS ${PACKAGE_NAME}  DESTINATION ./build/)
target_link_libraries(${PACKAGE_NAME} glog double-conversion)
