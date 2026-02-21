const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const schema = {
        title: '禁限用物质分析记录表',
        header: {
            methodBasis: 'QC/T 941-2013、QC/T 942-2021、IEC 62321',
            sampleType: '汽车零部件'
        },
        columns: [
            { title: '序号', dataIndex: 'seq', width: 60, dataType: 'string' },
            { title: '样品编号', dataIndex: 'sampleNo', width: 120, dataType: 'string' },
            { title: '检测项目', dataIndex: 'testItem', width: 120, dataType: 'string' },
            { title: 'XRF筛选结果', dataIndex: 'xrfResult', width: 120, dataType: 'string' },
            { title: '化学验证结果', dataIndex: 'chemResult', width: 120, dataType: 'string' },
            { title: '限值要求', dataIndex: 'standardReq', width: 120, dataType: 'string' },
            { title: '单项判定', dataIndex: 'conclusion', width: 100, dataType: 'string' },
            { title: '备注', dataIndex: 'remark', width: 120, dataType: 'string' }
        ],
        statistics: [],
        environment: true,
        equipment: true,
        personnel: true,
        defaultRows: 6
    };

    const updated = await p.testTemplate.update({
        where: { code: 'IT-30Y9HT01' },
        data: { schema: JSON.stringify(schema) }
    });
    console.log('QCT模板schema已更新, id:', updated.id);

    // 验证
    const verify = await p.testTemplate.findFirst({ where: { code: 'IT-30Y9HT01' }, select: { schema: true } });
    const s = typeof verify.schema === 'string' ? JSON.parse(verify.schema) : verify.schema;
    console.log('title:', s.title);
    console.log('columns:', s.columns.map(c => c.title).join(', '));
    console.log('defaultRows:', s.defaultRows);
    await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
