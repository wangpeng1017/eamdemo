SET NAMES utf8mb4;
USE lims;

-- 3. 检测模版 测试数据
INSERT INTO biz_test_template (id, code, name, category, method, unit, version, `schema`, status, author, createdAt, updatedAt) VALUES
('tt001', 'MB20250107001', '复合材料拉伸性能检测模版', '复合材料', 'GB/T 3354-2014', 'MPa', '1.0',
 '{"title":"复合材料拉伸性能试验记录","columns":[{"title":"样品序号","dataIndex":"index"},{"title":"拉伸强度MPa","dataIndex":"tensileStrength"}]}',
 'active', '系统管理员', NOW(), NOW()),
('tt002', 'MB20250107002', '金属材料拉伸试验模版', '金属材料', 'GB/T 228.1-2021', 'MPa', '1.0',
 '{"title":"金属材料拉伸试验记录","columns":[{"title":"样品序号","dataIndex":"index"},{"title":"屈服强度MPa","dataIndex":"yieldStrength"}]}',
 'active', '系统管理员', NOW(), NOW()),
('tt003', 'MB20250107003', '混凝土抗压强度检测模版', '混凝土', 'GB/T 50081-2019', 'MPa', '1.0',
 '{"title":"混凝土抗压强度试验记录","columns":[{"title":"试件编号","dataIndex":"sampleNo"},{"title":"抗压强度MPa","dataIndex":"strength"}]}',
 'active', '系统管理员', NOW(), NOW()),
('tt004', 'MB20250107004', '金相组织检验模版', '金相分析', 'GB/T 13298-2015', '-', '1.0',
 '{"title":"金相组织检验记录","fields":[{"type":"text","label":"试样编号","name":"sampleNo"}]}',
 'active', '系统管理员', NOW(), NOW()),
('tt005', 'MB20250107005', '水质检测模版', '水质检测', 'GB/T 5750-2006', 'mg/L', '1.0',
 '{"title":"水质检测原始记录","columns":[{"title":"检测项目","dataIndex":"item"},{"title":"测定值","dataIndex":"value"}]}',
 'active', '系统管理员', NOW(), NOW());

-- 4. 人员资质 测试数据
INSERT INTO biz_personnel_capability (id, userId, standardId, parameter, certificate, expiryDate, createdAt, updatedAt) VALUES
('pc001', 'cmk2qlfk5000fnnnjtvxw7dnu', 'std001', '拉伸强度', '力学检测员证', '2026-12-31', NOW(), NOW()),
('pc002', 'cmk2qlfk5000fnnnjtvxw7dnu', 'std002', '屈服强度', '力学检测员证', '2026-12-31', NOW(), NOW()),
('pc003', 'cmk2qlfk7000hnnnj73thobuy', 'std001', '弹性模量', '力学检测高级证', '2027-06-30', NOW(), NOW()),
('pc004', 'cmk2qlfmb000lnnnjqqd34u6r', 'std004', '抗压强度', '混凝土检测员证', '2025-12-31', NOW(), NOW()),
('pc005', 'cmk2qlfk5000fnnnjtvxw7dnu', 'std003', '晶粒度', '金相检验员证', '2026-03-31', NOW(), NOW());

-- 5. 能力评审 测试数据
INSERT INTO biz_capability_review (id, userId, capabilityId, trainingContent, examDate, examResult, createdAt, updatedAt) VALUES
('cr001', 'cmk2qlfk5000fnnnjtvxw7dnu', 'pc001', '复合材料拉伸性能检测培训及实操考核', '2024-12-15', 'Pass', NOW(), NOW()),
('cr002', 'cmk2qlfk7000hnnnj73thobuy', 'pc003', '力学检测高级认证培训及理论考试', '2024-11-20', 'Pass', NOW(), NOW()),
('cr003', 'cmk2qlfmb000lnnnjqqd34u6r', 'pc004', '混凝土抗压强度检测实操培训', '2024-10-10', 'Pass', NOW(), NOW()),
('cr004', 'cmk2qlfk5000fnnnjtvxw7dnu', NULL, '金相组织检验方法学习及考核', '2024-12-01', 'Pass', NOW(), NOW()),
('cr005', 'cmk2qlflm000jnnnji2h59hbp', NULL, '水质检测标准及实验室质量控制培训', '2024-09-15', 'Fail', NOW(), NOW());

SELECT '测试数据插入完成' AS result;
