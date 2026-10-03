# ScienceX 开源许可证声明（Open Source License Statement）

> 本文档为 ScienceX · AI 科研工作台项目的开源许可证合规声明，对应大赛建议提交物第 5 项「开源 License（MIT/Apache 2.0 等 OSI 认证 License，用于参评最佳开源奖）」。

---

## 一、主许可证（Main License）

本项目全部自研源代码（`backend/`、`frontend/`、`docs/` 及根目录配置文件）在 **MIT License** 下发布。

- **许可证类型**：The MIT License (MIT)
- **OSI 认证状态**：✅ 已通过 [Open Source Initiative](https://opensource.org/license/mit) 认证的开源许可证
- **许可证全文**：见仓库根目录 [`LICENSE`](LICENSE) 文件及本文档附录 A
- **版权声明**：Copyright © 2026 ScienceX contributors

MIT 许可证与 Apache License 2.0 同属 OSI 认证的宽松型（Permissive）开源许可证，二者对比如下：

| 对比项 | MIT（本项目采用） | Apache 2.0 |
| :--- | :--- | :--- |
| OSI 认证 | ✅ | ✅ |
| 允许商用 / 修改 / 分发 | ✅ | ✅ |
| 保留版权声明要求 | ✅ | ✅ |
| 显式专利授权条款 | ✗（隐式） | ✅ |
| 修改标注要求 | ✗ | ✅ |
| 许可证复杂度 | 极简（约 170 词） | 较高 |

本项目选择 MIT 的理由：最大化降低使用与传播门槛，与项目技术栈主许可证（React、Vite、Express 等均为 MIT）保持完全兼容，无许可证冲突风险。

---

## 二、第三方依赖许可证清单（Third-Party Licenses）

本项目依赖的开源组件均采用 OSI 认证的宽松许可证，与 MIT 主许可证兼容，合规无冲突：

### 后端依赖（`backend/package.json`）

| 组件 | 版本 | 许可证 | OSI 认证 |
| :--- | :--- | :--- | :---: |
| [Express](https://github.com/expressjs/express) | ^4.19.2 | MIT | ✅ |
| [cors](https://github.com/expressjs/cors) | ^2.8.5 | MIT | ✅ |

### 前端依赖（`frontend/package.json`）

| 组件 | 版本 | 许可证 | OSI 认证 |
| :--- | :--- | :--- | :---: |
| [React / React DOM](https://github.com/facebook/react) | ^18.3.1 | MIT | ✅ |
| [React Router DOM](https://github.com/remix-run/react-router) | ^6.26.2 | MIT | ✅ |
| [Vite](https://github.com/vitejs/vite) | ^5.4.7 | MIT | ✅ |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | ^4.3.1 | MIT | ✅ |
| [TypeScript](https://github.com/microsoft/TypeScript) | ^5.5.4 | Apache 2.0 | ✅ |
| [@types/react / @types/react-dom](https://github.com/DefinitelyTyped/DefinitelyTyped) | ^18.3.x | MIT | ✅ |

> 运行时零额外依赖策略：后端 AI 网关、文档解析（PDF/Word/Markdown/CAJ）、签名令牌、限流等核心模块均基于 Node.js 标准库自研实现，未引入额外第三方运行时依赖，许可证审计面最小。

---

## 三、权利与义务摘要

### 使用者可以（Permissions）
- ✅ 商业使用、复制、修改、合并、出版发行、再许可与销售
- ✅ 分发衍生作品（闭源或开源均可）

### 使用者必须（Conditions）
- ⚠️ 在软件所有副本或实质部分中保留原始版权声明与本许可证声明

### 免责声明（Limitations）
- 本软件按「现状」提供，作者不作任何明示或暗示的担保（包括但不限于适销性、特定用途非侵权）
- 作者不对因使用本软件产生的任何索赔、损害或其他责任负责

---

## 四、学术与伦理声明

1. **AI 生成内容**：本项目集成的 AI 生成功能仅供科研辅助参考，生成内容的准确性由使用者自行核实；本项目不对 AI 输出的科学正确性承担担保责任。
2. **学术诚信**：本项目的论文润色、降重等功能仅面向合规学术写作辅助场景，明确反对将其用于代写、学术不端等违反各科研机构学术诚信政策的行为。
3. **数据隐私**：本许可证不涵盖对用户数据的任何承诺；部署者应自行遵守所在司法辖区的数据保护法规。

---

## 附录 A：MIT License 全文

```text
MIT License

Copyright (c) 2026 ScienceX contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 附录 B：MIT 许可证中文参考译文（非官方，仅供参考）

> MIT 许可证
>
> 版权所有 © 2026 ScienceX 贡献者
>
> 特此免费授予任何获得本软件及相关文档文件（以下简称"软件"）副本的人士不受限制地处理软件的权利，包括但不限于使用、复制、修改、合并、发布、分发、再许可及/或销售软件副本的权利，但须符合以下条件：
>
> 上述版权声明和本许可声明应包含在软件的所有副本或实质部分中。
>
> 本软件按"现状"提供，不含任何明示或暗示的担保，包括但不限于对适销性、特定用途适用性及非侵权的担保。在任何情况下，作者或版权持有人均不对因软件或使用或与其他软件交易而产生的任何索赔、损害或其他责任负责，无论是合同诉讼、侵权诉讼还是其他诉讼。
