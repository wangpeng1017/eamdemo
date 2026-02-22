// 报价单打印配置默认值（来源：国轻检测报价单-模板.xlsx）

// 送样信息
export const DEFAULT_SAMPLE_DELIVERY = {
    address: '江苏省扬州市邗江区金山路号99号B座',
    tel: '17605280797',
    contact: '王璐',
}

// 收款方信息
export const DEFAULT_PAYEE = {
    name: '江苏国轻检测技术有限公司',
    bank: '中国工商银行股份有限公司扬州开发支行',
    bankNo: '102312002133',
    account: '1108021309100289674',
}

// 附加条款（6条，含中英文）
export const DEFAULT_TERMS = [
    {
        zh: '1、此报价依据贵公司提供的资料而估算，有效期为一个月。若提供的资料有改动，此报价单将随之更新。如贵公司同意以上报价，请签名盖章后将此件回传本公司，以便执行订单。本报价单经双方签字确认并盖章后，等同双方的检测委托合同。非常感谢您的支持！',
        en: 'This quotation is estimated based on the information provided by your company and is valid for one month. If the provided information is modified, this quotation will be updated accordingly. If your company agrees to the above terms, please sign, stamp, and return this document to our company for order execution. Once signed and stamped by both parties, this quotation will serve as the testing service agreement between both parties. Thank you for your support!',
    },
    {
        zh: '2、请按要求仔细填写测试申请表并确认，内容可根据贵公司需要填写，测试及报告内容都将以贵司提供的资料进行。测试报告完成后，提供报告。若有任何修改，每份报告需支付 RMB100 元修改费；',
        en: 'Please carefully fill out and confirm the testing application form as required. The content can be customized according to your company\'s needs, and the testing and report content will be based on the information provided by your company. After the test report is completed, it will be delivered to you. If any modifications are required, a fee of RMB 100 per report will be charged.',
    },
    {
        zh: '3、付款条件：客户方在检测方出具报告之日起 30 天内付款。如客户方未在上述期限内付款，逾期每天加收千分之一的滞纳金，直至客户方支付拖欠的所有款项。',
        en: 'Payment Terms: The client shall make payment within 30 days from the date the testing agency issues the report. If payment is not made within the specified period, a late fee of 0.1% per day will be charged until full payment is settled.',
    },
    {
        zh: '4、本报价单所提供的服务应遵循中华人民共和国相关法律及我公司服务条款。',
        en: 'The services provided in this quotation shall comply with the relevant laws of the People\'s Republic of China and our company\'s service terms.',
    },
    {
        zh: '5、双方均同意电子邮件、传真件、扫描件与原件具有同等法律效力；',
        en: 'Both parties agree that emails, faxes, and scanned copies shall have the same legal effect as the original documents.',
    },
    {
        zh: '6、如双方发生纠纷，应向客户方或检测方所在地法院提起诉讼。',
        en: 'In case of disputes, both parties shall file a lawsuit with the court where the customer or the testing party is located.',
    },
]
