/**
 * 委托单打印配置默认值
 * 来源：测试申请表-通用.xls
 * 所有文本可在编辑表单中修改
 */

// 样品管理规定
export const DEFAULT_SAMPLE_RULE = '样品保存时间原则上不少于3个月，如对试验样品封样周期有特殊要求的，以正式版DVP或技术协议规定为准。'

// 周期说明
export const DEFAULT_CYCLE_DESC = `材料测试服务周期要求：
常规服务：非老化项目5~7工作日，长期老化项目按老化箱排期+老化时间+3~5工作日；粒料需注塑制样按上述周期+3~4工作日；
加急服务：非老化项目3~4工作日，50%加急费；（请联系实验室确认是否接受加急）
双倍加急服务：非老化项目2~3工作日，100%加急费；（请联系实验室确认是否接受加急）
特急服务：非老化项目1工作日，150%加急费（请联系实验室确认是否接受加急）`

// 分包声明
export const DEFAULT_SUBCONTRACT_STATEMENT = 'We do not accept subcontracting certain tests to other qualified subcontractor of ALTC. (Deemed to be accepted if not selected.) Note: For those test items not accredited by Chery in our lab, we can provide delivery service only, but will not consolidate the test results subcontracted. 本公司不同意由江苏国轻检测技术有限公司将某些测试项目安排在其他合格的分包实验室进行。（如未选择，视为接受。）注：对于本实验室无奇瑞认可资质的项目，仅提供代送服务，不予整合报告。'

// 费用声明
export const DEFAULT_FEE_STATEMENT = 'We request for the above test and agree that all testing will be carried out subject to ALTC scale of charges as set forth in their price list of which we have seen a copy. 我们要求进行以上测试，并将依照ALTC所执行的价目表来付费。'

// 附件说明
export const DEFAULT_ATTACHMENT_NOTE = '注：如果委托单位置不够，可以附件形式提供，并签字盖章确认。成品样品做材料类测试请指定取样/测试位置（可附示意图），如未指定，默认由实验室任选位置取样/测试。'

// 底部注释 Notes
export const DEFAULT_NOTES = [
    {
        zh: '1. 除非特别指定，江苏国轻检测技术有限公司对测试完全有判断权，其中包括测试方法的选择，以及使用最新版本的测试方法来完成测试。',
        en: '1. Unless it is specified, ALTC has the full discretion in carrying out the test, which including selection and using the latest edition of the testing method(s).',
    },
    {
        zh: '2. 测试样品在实验室最长保存3个月（液体样品保存十五天），之后实验室将按规定处理。',
        en: '2. Test sample will be disposed after three months upon test report issued without sample returning at application.',
    },
    {
        zh: '3. 江苏国轻检测技术有限公司保证所有项目均以合法的程序进行测试，并保证测试数据的准确性。如因本公司过错造成委托方损失的，本公司根据委托方的直接损失情况，承担不高于该项目检测费用3倍的损失。',
        en: '3. ALTC assure the Applicant the validity of the procedure, and the accuracy of the test results, of all test items in the test reports. For any direct economic losses to the Applicant caused by our fault or negligence, we will compensate the Applicant at an amount of up to thrice of the test fee.',
    },
    {
        zh: '4. 请将本申请表及附页的相关信息填写完整并回签，以便安排测试，本公司将竭诚地为您服务。',
        en: '4. Please sign and chop on the form, and sent back to us for arrangement test, with many thanks.',
    },
    {
        zh: '5. 此申请表适用江苏国轻检测技术有限公司及其子公司。',
        en: '5. This application form is applicable to ALTC and its subsidiaries.',
    },
]

// 组合为一个完整的 printTerms 默认值对象
export function getDefaultPrintTerms() {
    return {
        sampleRule: DEFAULT_SAMPLE_RULE,
        cycleDesc: DEFAULT_CYCLE_DESC,
        subcontractStatement: DEFAULT_SUBCONTRACT_STATEMENT,
        feeStatement: DEFAULT_FEE_STATEMENT,
        attachmentNote: DEFAULT_ATTACHMENT_NOTE,
        notes: DEFAULT_NOTES,
    }
}
