# Strapi 数据库导入脚本

这个目录包含了用于向 Strapi 数据库导入数据的脚本工具。

## 功能特性

- 📊 **Excel 数据导入**: 从 Excel 文件导入 NGO 组织数据
- 🔄 **数据转换**: 自动转换 Excel 数据格式为 Strapi 兼容格式
- 🛡️ **安全检查**: 防止重复数据，支持干运行模式
- 📈 **批量处理**: 支持批量导入，避免 API 限制
- 📝 **详细日志**: 提供详细的导入进度和错误信息
- 🔧 **灵活配置**: 支持环境变量配置各种参数

## 文件说明

- `import-data.js` - 主要的数据导入脚本
- `create-admin-user.js` - 创建管理员用户和 API Token 的工具脚本

- `README.md` - 使用说明文档

## 快速开始

### 1. 安装依赖

```bash
# 在项目根目录安装所有依赖
pnpm install
```

### 2. 启动 Strapi 服务

确保你的 Strapi 服务正在运行：

```bash
# 使用 Docker Compose
docker compose up

# 或者直接运行 Strapi
pnpm develop
```

### 3. 创建管理员用户和 API Token

如果你已经有管理员账户，可以通过以下步骤在 Strapi 管理界面中创建 API Token：

1. **登录 Strapi 管理界面**

   ```
   http://localhost:1337/admin
   ```

2. **进入 API Tokens 设置**
   - 点击左侧菜单的 `Settings`（设置）
   - 在 `Global Settings` 部分找到 `API Tokens`
   - 点击 `API Tokens`

3. **创建新的 Token**
   - 点击 `Create new API Token` 按钮
   - 填写以下信息：
     - **Name**: `Import Script Token` (或自定义名称)
     - **Description**: `Token for data import scripts` (可选)
     - **Token duration**: `Unlimited` (推荐) 或设置过期时间
     - **Token type**: `Full access` (需要完整权限来创建数据)

4. **保存并复制 Token**
   - 点击 `Save` 保存
   - **重要**: 复制生成的 Token 并安全保存，Token 只会显示一次
   - 将 Token 设置为环境变量：
     ```bash
     export STRAPI_TOKEN="your_copied_token_here"
     ```

**注意**: 请确保 Token 具有足够的权限来创建和管理组织数据。建议使用 `Full access` 类型的 Token。

### 4. 准备 Excel 数据文件

确保你的 Excel 文件位于项目根目录，默认文件名为 `教育公益开放式数据库.xlsx`。

Excel 文件应包含以下列（支持中英文列名）：

- **组织名称/name** - 组织名称（必填）
- **组织代码/code** - 组织代码
- **实体类型/entityType** - 实体类型（基金会、民办非企业单位、社会团体、企业、政府机构、学校、其他）
- **注册国家/registrationCountry** - 注册国家（中国、国际）
- **成立日期/establishedDate** - 成立日期
- **省份/province** - 省份
- **城市/city** - 城市
- **区县/district** - 区县
- **街道/street** - 街道
- **覆盖区域/coverageArea** - 覆盖区域
- **描述/description** - 组织描述
- **员工数量/staffCount** - 员工数量
- **服务类别** - 服务类别
- **服务内容** - 服务内容
- **目标群体** - 目标群体
- **支持方式** - 支持方式
- **官网/website** - 官方网站
- **邮箱/email** - 邮箱地址
- **电话/phone** - 联系电话

### 5. 运行导入脚本

```bash
# 分析Excel文件结构
node analyze-excel.js

# 干运行模式（推荐先测试）
DRY_RUN=true node import-data.js

# 测试模式（只导入前100行）
MAX_ROWS=100 DRY_RUN=true node import-data.js

# 正式导入所有数据
STRAPI_TOKEN=your_api_token node import-data.js

# 导入甘肃省数据工作表
SHEET_NAME=甘肃省 STRAPI_TOKEN=your_api_token node import-data.js

# 使用自定义配置
EXCEL_FILE=my-data.xlsx STRAPI_TOKEN=your_api_token node import-data.js
```

## 配置选项

### 环境变量

| 变量名         | 默认值                                 | 说明                                   |
| -------------- | -------------------------------------- | -------------------------------------- |
| `STRAPI_URL`   | `http://localhost:1337`                | Strapi 服务器地址                      |
| `STRAPI_TOKEN` | -                                      | Strapi API Token（必填，除非 DRY_RUN） |
| `EXCEL_FILE`   | `教育公益开放式数据库1.0版的副本.xlsx` | Excel 文件路径                         |
| `BATCH_SIZE`   | `10`                                   | 批量处理大小                           |
| `DRY_RUN`      | `false`                                | 是否为模拟模式                         |

### 命令行选项

```bash
# 显示帮助
node import-data.js --help

# 干运行模式
node import-data.js --dry-run
```

## 数据映射

### 实体类型映射

| Excel 值       | Strapi 值   |
| -------------- | ----------- |
| 基金会         | foundation  |
| 民办非企业单位 | ngo         |
| 社会团体       | association |
| 企业           | company     |
| 政府机构       | government  |
| 学校           | school      |
| 其他           | other       |

### 服务类别映射

| Excel 值 | Strapi 值            |
| -------- | -------------------- |
| 学前教育 | early_education      |
| 小学教育 | primary_education    |
| 中学教育 | secondary_education  |
| 高等教育 | higher_education     |
| 职业教育 | vocational_education |
| 继续教育 | continuing_education |
| 特殊教育 | special_education    |
| 社区教育 | community_education  |
| 政策研究 | policy_research      |
| 教师发展 | teacher_development  |
| 教育内容 | educational_content  |
| 教育硬件 | educational_hardware |
| 学生支持 | student_support      |
| 扫盲项目 | literacy_programs    |
| 组织支持 | organization_support |
| 其他     | other                |

## 故障排除

### 常见错误

1. **无法连接到 Strapi 服务器**
   - 检查 `STRAPI_URL` 是否正确
   - 确保 Strapi 服务正在运行
   - 检查网络连接

2. **API Token 无效**
   - 重新运行 `node scripts/create-admin-user.js` 生成新的 Token
   - 检查 Token 是否正确设置

3. **Excel 文件读取失败**
   - 检查文件路径是否正确
   - 确保文件格式为 `.xlsx`
   - 检查文件是否损坏

4. **数据验证失败**
   - 检查必填字段是否完整
   - 验证数据格式是否正确
   - 查看错误日志定位具体问题

### 调试技巧

1. **使用干运行模式**

   ```bash
   DRY_RUN=true node import-data.js
   ```

2. **减少批次大小**

   ```bash
   BATCH_SIZE=1 STRAPI_TOKEN=your_token node import-data.js
   ```

3. **查看详细错误信息**
   - 脚本会输出详细的错误信息
   - 检查 Strapi 服务器日志

## 扩展功能

### 添加新的数据源

1. 创建新的读取器类（参考 `ExcelReader`）
2. 修改数据转换器 `DataTransformer`
3. 更新主函数以支持新的数据源

### 添加新的数据类型

1. 在 `DataTransformer` 中添加新的转换方法
2. 更新数据验证逻辑
3. 修改 API 调用方法

### 性能优化

1. 调整 `BATCH_SIZE` 参数
2. 实现并行处理
3. 添加数据缓存机制

## 许可证

这个项目遵循与主项目相同的许可证。
