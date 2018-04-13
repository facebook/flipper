cmake_minimum_required (VERSION 3.6.0)
set(PACKAGE_NAME      "easywsclient")
include_directories(./)
set(SOURCES easywsclient.cpp)
add_compile_options(
    -std=c++11
    -stdlib=libstdc++
    -Wall
    )

add_library(${PACKAGE_NAME} SHARED ${SOURCES})
install(TARGETS ${PACKAGE_NAME}  DESTINATION ./build/)
target_link_libraries(${PACKAGE_NAME})
