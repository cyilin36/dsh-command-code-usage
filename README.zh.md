# dsh-command-code-usage

**[中文 →](README.zh.md)**

[Command Code](https://commandcode.ai/) 用量监控插件，给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 用。

> 仿照 **[xueayi/dsh-opencode-go-usage](https://github.com/xueayi/dsh-opencode-go-usage)** 写的。
> 如果你用的是 **OpenCode Go**，直接装那个 —— 本插件就是照它做的。
> 感谢原作者 [雪阿宜（xueayi）](https://github.com/xueayi)。

## 作用

Web 界面角落里一个悬浮坞：

- 两个环（5h 滚动、本周），显示剩余额度百分比，用得越多越红
- 5h 窗口重置倒计时
- 信用余额（订阅 / 购买 / 赠送）
- 点开有明细面板，可拖动，有极简模式
- 刷新失败不会空白，继续显示上次的数据

另外把 Command Code 注册成 DSH 的模型提供商，所以它也能当聊天模型用。

## 用法

**1. 安装**

```sh
dsh plugin --profile web add github:cyilin36/dsh-command-code-usage
```

然后重启 `dsh web`。

**2. 填 API Key**

任选一种：

- 直接粘进悬浮坞
- 设置 → 模型 → Command Code
- 设环境变量 `COMMAND_CODE_API_KEY`

Key 在 [commandcode.ai](https://commandcode.ai/) 申请。

**3. 完成**

右下角会出现用量坞。拖到顺手的位置即可。

## License

MIT
