# -*- coding: utf-8 -*-
"""
在 2.QCT初筛-原始记录.docx 的 XML 中插入 docxtemplater 占位符
生成可用的模板文件 public/templates/qct-original-record.docx
"""
import zipfile, shutil, os, re
import xml.etree.ElementTree as ET

SRC = 'docs/2.QCT初筛-原始记录.docx'
DST = 'public/templates/qct-original-record.docx'
WORK = '/tmp/_orig_template_work'
NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

# 注册命名空间避免 ET 重写前缀
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
    """在单元格中设置文本（替换现有内容或添加新的 run）"""
    # 找到第一个 <w:p>
    p = cell.find('w:p', ns)
    if p is None:
        p = ET.SubElement(cell, f'{{{NS}}}p')

    # 移除已有的 <w:r> (文本 run)，保留 <w:pPr>
    for r in p.findall('w:r', ns):
        p.remove(r)

    # 添加新的 run
    r = ET.SubElement(p, f'{{{NS}}}r')
    t = ET.SubElement(r, f'{{{NS}}}t')
    t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    t.text = text

def get_cell_text(cell):
    """获取单元格文本"""
    texts = []
    for t in cell.findall('.//w:t', ns):
        if t.text:
            texts.append(t.text)
    return ''.join(texts).strip()

def process():
    base = os.path.dirname(os.path.abspath(__file__))
    src_path = os.path.join(base, SRC)
    dst_path = os.path.join(base, DST)

    # 1. 清理工作目录 & 解压
    if os.path.exists(WORK):
        shutil.rmtree(WORK)
    os.makedirs(WORK)

    with zipfile.ZipFile(src_path, 'r') as z:
        z.extractall(WORK)

    # 2. 解析 document.xml
    doc_xml = os.path.join(WORK, 'word', 'document.xml')
    tree = ET.parse(doc_xml)
    root = tree.getroot()

    body = root.find(f'{{{NS}}}body')
    main_tbl = body.findall(f'{{{NS}}}tbl')[0]
    rows = main_tbl.findall(f'{{{NS}}}tr')

    # ============ 主表格占位符 ============

    # Row 0: 委托编号 | {entrustmentNo} | 接样日期 | {receivedDate}
    cells = rows[0].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{entrustmentNo}')
    set_cell_text(cells[3], '{receivedDate}')

    # Row 1: 样品编号 | {sampleNo} | 接样人 | {receiver}
    cells = rows[1].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{sampleNo}')
    set_cell_text(cells[3], '{receiver}')

    # Row 2: 样品名称 | {sampleName} | 检测日期 | {testDate}
    cells = rows[2].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{sampleName}')
    set_cell_text(cells[3], '{testDate}')

    # Row 3: 样品描述 | {sampleDesc} | 检测环境 | {temperature}℃/ {humidity}%RH
    cells = rows[3].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{sampleDesc}')
    set_cell_text(cells[3], '{temperature}℃/      {humidity}%RH')

    # Row 6: 检测项目 | {testProject}
    cells = rows[6].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{testProject}')

    # Row 11: 备注 | {remark}
    cells = rows[11].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{remark}')

    # Row 15: 检测人 | {tester} | 复核人 | {reviewer}
    cells = rows[15].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{tester}')
    set_cell_text(cells[3], '{reviewer}')

    # Row 16: 试验日期 | {testDateSign} | 核查日期 | {reviewDate}
    cells = rows[16].findall(f'{{{NS}}}tc')
    set_cell_text(cells[1], '{testDateSign}')
    set_cell_text(cells[3], '{reviewDate}')

    # ============ Row 13 嵌套检测结果表占位符 ============
    row13_cell = rows[13].findall(f'{{{NS}}}tc')[0]
    nested_tbls = row13_cell.findall(f'.//{{{NS}}}tbl')
    data_tbl = nested_tbls[0]  # 第一个嵌套表 = 检测数据表
    data_rows = data_tbl.findall(f'{{{NS}}}tr')

    # 3个样品，每个样品6行 (R1-R6, R7-R12, R13-R18)
    # 每组结构:
    #   R+0 (Pb,  7c): C0=seq, C1=sampleNo, C2=Pb(固定), C3=t1, C4=t2, C5=avg, C6=remark
    #   R+1 (Hg,  7c): C0-C1 vMerge, C2=Hg(固定), C3=t1, C4=t2, C5=avg, C6=remark
    #   R+2 (Cd,  7c): same pattern
    #   R+3 (Cr,  8c): C0-C1 vMerge, C2=Cr(固定), C3=Cr6+(固定), C4=t1, C5=t2, C6=avg, C7=remark
    #   R+4 (PBBs,8c): C0-C1 vMerge, C2=Br, C3=PBBs(固定), C4=t1, C5=t2, C6=avg, C7=remark
    #   R+5 (PBDEs,8c): all vMerge continue (no data cells needed)

    items_7c = ['pb', 'hg', 'cd']  # Pb/Hg/Cd 行有7列，数据在 C3-C6
    items_8c_cr = 'cr'              # Cr 行有8列，数据在 C4-C7
    items_8c_br = 'br'              # Br/PBBs 行有8列，数据在 C4-C7

    for sample_idx in range(3):
        s = sample_idx + 1  # s1, s2, s3
        base_row = 1 + sample_idx * 6  # R1, R7, R13

        # --- Pb 行 (base_row + 0) ---
        r = data_rows[base_row]
        cells = r.findall(f'{{{NS}}}tc')
        set_cell_text(cells[0], '{' + f's{s}_seq' + '}')      # 序号
        set_cell_text(cells[1], '{' + f's{s}_sampleNo' + '}') # 样品编号
        # C2 = Pb (保持固定)
        set_cell_text(cells[3], '{' + f's{s}_pb_t1' + '}')
        set_cell_text(cells[4], '{' + f's{s}_pb_t2' + '}')
        set_cell_text(cells[5], '{' + f's{s}_pb_avg' + '}')
        set_cell_text(cells[6], '{' + f's{s}_pb_remark' + '}')

        # --- Hg 行 (base_row + 1) ---
        r = data_rows[base_row + 1]
        cells = r.findall(f'{{{NS}}}tc')
        set_cell_text(cells[3], '{' + f's{s}_hg_t1' + '}')
        set_cell_text(cells[4], '{' + f's{s}_hg_t2' + '}')
        set_cell_text(cells[5], '{' + f's{s}_hg_avg' + '}')
        set_cell_text(cells[6], '{' + f's{s}_hg_remark' + '}')

        # --- Cd 行 (base_row + 2) ---
        r = data_rows[base_row + 2]
        cells = r.findall(f'{{{NS}}}tc')
        set_cell_text(cells[3], '{' + f's{s}_cd_t1' + '}')
        set_cell_text(cells[4], '{' + f's{s}_cd_t2' + '}')
        set_cell_text(cells[5], '{' + f's{s}_cd_avg' + '}')
        set_cell_text(cells[6], '{' + f's{s}_cd_remark' + '}')

        # --- Cr/Cr6+ 行 (base_row + 3, 8 cells) ---
        r = data_rows[base_row + 3]
        cells = r.findall(f'{{{NS}}}tc')
        # C0-C1 vMerge, C2=Cr, C3=Cr6+, C4-C7=data
        set_cell_text(cells[4], '{' + f's{s}_cr_t1' + '}')
        set_cell_text(cells[5], '{' + f's{s}_cr_t2' + '}')
        set_cell_text(cells[6], '{' + f's{s}_cr_avg' + '}')
        set_cell_text(cells[7], '{' + f's{s}_cr_remark' + '}')

        # --- Br/PBBs 行 (base_row + 4, 8 cells) ---
        r = data_rows[base_row + 4]
        cells = r.findall(f'{{{NS}}}tc')
        set_cell_text(cells[4], '{' + f's{s}_br_t1' + '}')
        set_cell_text(cells[5], '{' + f's{s}_br_t2' + '}')
        set_cell_text(cells[6], '{' + f's{s}_br_avg' + '}')
        set_cell_text(cells[7], '{' + f's{s}_br_remark' + '}')

        # --- PBDEs 行 (base_row + 5, 8 cells) ---
        # 所有数据列 vMerge=continue，不需要占位符

    # 3. 保存修改后的 XML
    tree.write(doc_xml, xml_declaration=True, encoding='UTF-8')

    # 4. 重新打包为 docx (ZIP)
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
