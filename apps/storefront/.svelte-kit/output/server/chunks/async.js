let async_mode_flag = false;
let tracing_mode_flag = false;
function enable_async_mode_flag() {
  async_mode_flag = true;
}
enable_async_mode_flag();
export {
  async_mode_flag as a,
  tracing_mode_flag as t
};
