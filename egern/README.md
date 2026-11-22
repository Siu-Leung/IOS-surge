# one.google.com 响应域名替换（Egern）

此模块只改写经过本机 Egern 的 `one.google.com` 文本响应，默认仅处理 POST，不是去广告模块。

## 导入

1. 在 Egern 打开「工具 → 模块 → 添加模块」，粘贴下方链接并启用。
2. 在 Egern 的 MITM 设置里确认 HTTPS 解密已开启、根证书已安装并受系统信任。
3. 重新发起相关请求。替换命中时，Egern 脚本日志会出现 `[replace-domains]`。验证完毕后可关闭本模块。

```text
https://raw.githubusercontent.com/Siu-Leung/IOS-surge/egern/egern/one-google-replace.module.yaml
```

## 文件与参数

- `one-google-replace.module.yaml`：Egern 原生 YAML 模块，已预设远程脚本地址，不用另行添加脚本。
- `replace-domains.js`：响应处理脚本，附件原样发布。
- `ONLY_POST`：默认开启；关闭后允许其他请求方法。
- `STRICT_BOUNDARY`：默认关闭，按字面字符串替换；开启后避免匹配更长标识中的片段。
- `PAIRS`：`旧=>新`，用分号隔开；默认 `30tb.ai.pro.m=>30tb.m;20tb.m.v2=>20tb.m`。按配置顺序替换，后面的规则可能匹配前面的替换结果。

Egern 将超过 10 MiB 的响应体跳过。模块没有额外运行依赖，也不需要账户凭据或 `.env`。

## 本地语法检查

在本目录运行 `node --input-type=module --check < replace-domains.js`。这只检查 JavaScript 语法，不代表已在 Egern 真机上验证。
