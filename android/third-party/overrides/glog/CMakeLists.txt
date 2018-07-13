cmake_minimum_required (VERSION 3.6.0)

PROJECT(glog CXX)
enable_language(CXX)
set(PACKAGE_NAME      glog)

set(glog_DIR glog-0.3.5)

list(APPEND dir_list ./../)
list(APPEND dir_list ./)
list(APPEND dir_list ${glog_DIR}/)
list(APPEND dir_list ${glog_DIR}/src)
list(APPEND dir_list ${glog_DIR}/glog)
list(APPEND dir_list ${glog_DIR}/base)

include_directories(${dir_list})

  add_compile_options(
    -std=c++11
    -Wno-macro-redefined
    -Wno-macro-redefined
    -Wall
    -Wwrite-strings
    -Woverloaded-virtual
    -Wno-sign-compare
    -DNDEBUG
    -g
    -O2
    -D_START_GOOGLE_NAMESPACE_="namespace google {"
    -D_END_GOOGLE_NAMESPACE_="}"
    )

list(APPEND src_files ${glog_DIR}/src/demangle.cc
                      ${glog_DIR}/src/logging.cc
                      ${glog_DIR}/src/raw_logging.cc
                      ${glog_DIR}/src/signalhandler.cc
                      ${glog_DIR}/src/symbolize.cc
                      ${glog_DIR}/src/utilities.cc
                      ${glog_DIR}/src/vlog_is_on.cc
                      )

add_library(${PACKAGE_NAME} SHARED ${src_files})
install(TARGETS ${PACKAGE_NAME}  DESTINATION ./build/)
target_link_libraries(${PACKAGE_NAME})
