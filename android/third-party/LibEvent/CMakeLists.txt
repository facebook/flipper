cmake_minimum_required (VERSION 3.6.0)

PROJECT(libevent C)
enable_language(C)
set(PACKAGE_NAME      libevent)
set(LIBEVENT_DIR  libevent-release-2.1.8-stable)
list(APPEND DIR_LIST ${LIBEVENT_DIR}/)
list(APPEND DIR_LIST ${LIBEVENT_DIR}/include)
include_directories(${DIR_LIST})
list(APPEND SRCFILES ${LIBEVENT_DIR}/event.c
                     ${LIBEVENT_DIR}/buffer.c
                     ${LIBEVENT_DIR}/bufferevent.c
                     ${LIBEVENT_DIR}/bufferevent_filter.c
                     ${LIBEVENT_DIR}/bufferevent_ratelim.c
                 	 ${LIBEVENT_DIR}/bufferevent_sock.c
                     ${LIBEVENT_DIR}/epoll.c
                 	 ${LIBEVENT_DIR}/epoll_sub.c
                 	 ${LIBEVENT_DIR}/evdns.c
                 	 ${LIBEVENT_DIR}/event_tagging.c
                 	 ${LIBEVENT_DIR}/evmap.c
                   	 ${LIBEVENT_DIR}/evrpc.c
                 	 ${LIBEVENT_DIR}/evthread.c
                 	 ${LIBEVENT_DIR}/evthread_pthread.c
                 	 ${LIBEVENT_DIR}/evutil.c
                 	 ${LIBEVENT_DIR}/evutil_rand.c
                 	 ${LIBEVENT_DIR}/http.c
                 	 ${LIBEVENT_DIR}/listener.c
                 	 ${LIBEVENT_DIR}/log.c
                 	 ${LIBEVENT_DIR}/poll.c
                 	 ${LIBEVENT_DIR}/select.c
                 	 ${LIBEVENT_DIR}/signal.c
                 	 ${LIBEVENT_DIR}/strlcpy.c
)

add_library(${PACKAGE_NAME} SHARED ${SRCFILES})
install(TARGETS ${PACKAGE_NAME}  DESTINATION ./build/)
target_link_libraries(${PACKAGE_NAME})
