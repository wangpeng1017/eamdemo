# -*- coding: utf-8 -*-
"""
在 QCT+检测报告.docx 的 XML 中插入 docxtemplater 占位符
生成可用的模板文件 public/templates/qct-client-report.docx
"""
import zipfile, shutil, os, re
import xml.etree.ElementTree as ET

SRC = 'docs/QCT+检测报告.docx'
DST = 'public/templates/qct-client-report.docx'
WORK = '/tmp/_client_template_work'
NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

ET.register_namespace('w', NS)
ET.register_namespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
ET.register_namespace('wp', 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing')
ET.register_namespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
ET.register_namespace('pic', 'http://schemas.openxmlformats.org/drawingml/2006/picture')
ET.register_namespace('mc', 'http://schemas.openxmlformats.org/markup-compatibility/2006')
ET.register_namespace('wps', 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape')
ET.register_namespace('w14', 'http://schemas.microsoft.com/office/word/2010/wordml')
ET.register_namespace('w15', 'http://schemas.microsoft.com/office/word/2012/wordml')
ET.register_namespace('wpc', 'http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas')
ET.register_namespace('wpg', 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup')
ET.register_namespace('v', 'urn:schemas-microsoft-com:vml')
ET.register_namespace('o', 'urn:schemas-microsoft-com:office:office')
ET.register_namespace('m', 'http://schemas.openxmlformats.org/officeDocument/2006/math')

ns = {'w': NS}

def set_cell_text(cell, text):
    """在单元格中设置文本"""
    p = cell.find(f'{{{NS}}}p')
    if p is None:
        p = ET.SubElement(cell, f'{{{NS}}}p')
    for r in p.findall(f'{{{NS}}}r'):
        p.remove(r)
    r = ET.SubElement(p, f'{{{NS}}}r')
    t = ET.SubElement(r, f'{{{NS}}}t')
    t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    t.text = text

def replace_text_in_paragraph(p, old_text, new_text):
    """替换段落中的文本（跨多个 run）"""
    # 收集所有 run 的文本
    runs = p.findall(f'{{{NS}}}r')
    full_text = ''
    run_map = []  # (run, t_elem, start_pos, end_pos)
    for r in runs:
        t = r.find(f'{{{NS}}}t')
        if t is not None and t.text:
            start = len(full_text)
            full_text += t.text
            run_map.append((r, t, start, len(full_text)))

    if old_text in full_text:
        new_full = full_text.replace(old_text, new_text)
        # 简单方案：将所有文本放到第一个 run，清空其余
        if run_map:
            run_map[0][1].text = new_full
            run_map[0][1].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
            for _, t, _, _ in run_map[1:]:
                t.text = ''
            return True
    return False

def process():
    base = os.path.dirname(os.path.abspath(__file__))
    src_path = os.path.join(base, SRC)
    dst_path = os.path.join(base, DST)

    if os.path.exists(WORK):
        shutil.rmtree(WORK)
    os.makedirs(WORK)

    with zipfile.ZipFile(src_path, 'r') as z:
        z.extractall(WORK)

    doc_xml = os.path.join(WORK, 'word', 'document.xml')
    tree = ET.parse(doc_xml)
    root = tree.getroot()

    body = root.find(f'{{{NS}}}body')

    # 收集 body 直接子元素中的表格
    tables = []
    for child in body:
        tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
        if tag == 'tbl':
            tables.append(child)

    print(f'Found {len(tables)} tables')

    # ============ Table 1: 封面信息 (10 rows) ============
    tbl1 = tables[1]
    rows = tbl1.findall(f'{{{NS}}}tr')

    # R0: 报告编号 | {reportNo}
    cells = rows[0].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{reportNo}')

    # R2: 样品名称 | {sampleName}
    cells = rows[2].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{sampleName}')

    # R4: 检测项目 | {testProject}
    cells = rows[4].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{testProject}')

    # R6: 委托单位 | {clientName}
    cells = rows[6].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{clientName}')

    # R8: 委托单位地址 | {clientAddress}
    cells = rows[8].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{clientAddress}')

    # ============ Table 2: 基本信息表 (12 rows) ============
    tbl2 = tables[2]
    rows = tbl2.findall(f'{{{NS}}}tr')

    # R0: 样品名称 | {sampleName}
    cells = rows[0].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{sampleName}')

    # R1: 样品编号 | {sampleNo}
    cells = rows[1].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{sampleNo}')

    # R2: 型号规格 | {specification}
    cells = rows[2].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{specification}')

    # R3: 委托单位 | {clientName}
    cells = rows[3].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{clientName}')

    # R4: 样品描述/状态 | {sampleDesc}
    cells = rows[4].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{sampleDesc}')

    # R5: 样品数量 | {sampleQuantity} | 送样日期 | {receivedDate}
    cells = rows[5].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{sampleQuantity}')
    set_cell_text(cells[3], '{receivedDate}')

    # R6: 检测类别 | 委托检测 | 委托编号 | {entrustmentNo}
    cells = rows[6].findall(f'{{{NS}}}tc')
    set_cell_text(cells[3], '{entrustmentNo}')

    # R7: 检测项目 | {testProject} - keep as ELV or make dynamic
    cells = rows[7].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{testProject}')

    # R9: 检测日期 | {testDate}
    cells = rows[9].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{testDate}')

    # R11: 备注 | {reportRemark}
    cells = rows[11].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{reportRemark}')

    # ============ Table 3: 检测结果表 (7 rows, 8 cols) ============
    tbl3 = tables[3]
    rows = tbl3.findall(f'{{{NS}}}tr')

    # R1 (Pb): C0=seq, C1=sampleNo, C2=sampleName, C3=Pb(固定), C4=xrf, C5=chem, C6=标准(固定), C7=结论
    cells = rows[1].findall(f'{{{NS}}}tc')
    set_cell_text(cells[0], '{r_seq}')
    set_cell_text(cells[1], '{r_sampleNo}')
    set_cell_text(cells[2], '{r_sampleName}')
    # C3 = Pb (keep fixed)
    set_cell_text(cells[4], '{r_pb_xrf}')
    set_cell_text(cells[5], '{r_pb_chem}')
    # C6 = ≤0.1% (keep fixed)
    set_cell_text(cells[7], '{r_pb_conclusion}')

    # R2 (Hg)
    cells = rows[2].findall(f'{{{NS}}}tc')
    set_cell_text(cells[4], '{r_hg_xrf}')
    set_cell_text(cells[5], '{r_hg_chem}')
    set_cell_text(cells[7], '{r_hg_conclusion}')

    # R3 (Cd)
    cells = rows[3].findall(f'{{{NS}}}tc')
    set_cell_text(cells[4], '{r_cd_xrf}')
    set_cell_text(cells[5], '{r_cd_chem}')
    set_cell_text(cells[7], '{r_cd_conclusion}')

    # R4 (Cr6+)
    cells = rows[4].findall(f'{{{NS}}}tc')
    set_cell_text(cells[4], '{r_cr_xrf}')
    set_cell_text(cells[5], '{r_cr_chem}')
    set_cell_text(cells[7], '{r_cr_conclusion}')

    # R5 (PBBs) - C4 has vMerge=restart (shared with PBDEs row)
    cells = rows[5].findall(f'{{{NS}}}tc')
    set_cell_text(cells[4], '{r_br_xrf}')
    set_cell_text(cells[5], '{r_pbbs_chem}')
    set_cell_text(cells[7], '{r_pbbs_conclusion}')

    # R6 (PBDEs) - C4 vMerge=continue (no XRF value needed)
    cells = rows[6].findall(f'{{{NS}}}tc')
    set_cell_text(cells[5], '{r_pbdes_chem}')
    set_cell_text(cells[7], '{r_pbdes_conclusion}')

    # ============ 段落中的签名占位符 ============
    # 找到 "编制：" 段落并替换
    all_paras = body.findall(f'.//{{{NS}}}p')
    for p in all_paras:
        texts = []
        for t in p.findall(f'.//{{{NS}}}t'):
            if t.text:
                texts.append(t.text)
        full = ''.join(texts)
        if '编制：' in full and '审核：' in full and '批准：' in full:
            replace_text_in_paragraph(p, full, '编制：{preparer}                          审核：{reviewer}                      批准：{approver}')
            print('  Replaced 编制/审核/批准 paragraph')
            break

    # 3. 保存
    tree.write(doc_xml, xml_declaration=True, encoding='UTF-8')

    # 4. 重新打包
    if os.path.exists(dst_path):
        os.remove(dst_path)

    with zipfile.ZipFile(dst_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for dirpath, dirnames, filenames in os.walk(WORK):
            for fn in filenames:
                full = os.path.join(dirpath, fn)
                arcname = os.path.relpath(full, WORK)
                zout.write(full, arcname)

    print(f'OK: {dst_path} ({os.path.getsize(dst_path)} bytes)')

    # 5. 验证占位符
    with zipfile.ZipFile(dst_path, 'r') as z:
        with z.open('word/document.xml') as f:
            content = f.read().decode('utf-8')

    placeholders = re.findall(r'\{[a-zA-Z0-9_]+\}', content)
    print(f'Found {len(placeholders)} placeholders:')
    for p in sorted(set(placeholders)):
        print(f'  {p}')

if __name__ == '__main__':
    process()
