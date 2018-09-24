#include "Log.h"

#ifdef __ANDROID__
#include <android/log.h>
#endif

namespace facebook {
namespace flipper {

  void log(const std::string& message) {
  #ifdef __ANDROID__
    __android_log_print(ANDROID_LOG_INFO, "sonar", "sonar: %s", message.c_str());
  #else
    printf("sonar: %s\n", message.c_str());
  #endif
  }


} // namespace flipper
} // namespace facebook
