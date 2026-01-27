-- 创建样品检测项表
-- 用于统一管理各业务模块的样品和检测项数据
-- 日期: 2026-01-27

CREATE TABLE IF NOT EXISTS biz_sample_test_item (
    id VARCHAR(50) PRIMARY KEY,
    biz_type VARCHAR(50) NOT NULL,           -- 业务类型: consultation/quotation/contract/entrustment/sample_receipt
    biz_id VARCHAR(50) NOT NULL,             -- 业务单据ID
    sample_name VARCHAR(200) NOT NULL,       -- 样品名称
    batch_no VARCHAR(100),                   -- 批号
    material VARCHAR(100),                   -- 材质
    appearance TEXT,                         -- 外观
    quantity INTEGER DEFAULT 1,              -- 数量
    test_template_id VARCHAR(50),            -- 检测项目ID（关联检测项目模板）
    test_item_name VARCHAR(200) NOT NULL,    -- 检测项目名称
    test_standard VARCHAR(200),              -- 检测标准
    judgment_standard TEXT,                  -- 判定标准
    sort_order INTEGER DEFAULT 0,            -- 排序
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_sample_test_item_biz ON biz_sample_test_item(biz_type, biz_id);
CREATE INDEX IF NOT EXISTS idx_sample_test_item_template ON biz_sample_test_item(test_template_id);

-- 添加表注释
COMMENT ON TABLE biz_sample_test_item IS '样品检测项统一管理表';
COMMENT ON COLUMN biz_sample_test_item.biz_type IS '业务类型: consultation(委托咨询)/quotation(报价单)/contract(合同)/entrustment(委托单)/sample_receipt(收样登记)';
COMMENT ON COLUMN biz_sample_test_item.biz_id IS '业务单据ID';
COMMENT ON COLUMN biz_sample_test_item.sample_name IS '样品名称';
COMMENT ON COLUMN biz_sample_test_item.batch_no IS '批号';
COMMENT ON COLUMN biz_sample_test_item.material IS '材质';
COMMENT ON COLUMN biz_sample_test_item.appearance IS '外观';
COMMENT ON COLUMN biz_sample_test_item.quantity IS '数量';
COMMENT ON COLUMN biz_sample_test_item.test_template_id IS '检测项目ID（关联检测项目模板）';
COMMENT ON COLUMN biz_sample_test_item.test_item_name IS '检测项目名称';
COMMENT ON COLUMN biz_sample_test_item.test_standard IS '检测标准';
COMMENT ON COLUMN biz_sample_test_item.judgment_standard IS '判定标准';
