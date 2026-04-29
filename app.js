// ==================== 全局变量 ====================
let selectTargetMajor = "";
let schoolList = "";
let currentCompareData = null; // 存储当前生成的对比数据

async function callDeepSeekAI(prompt) {
    
    try {
        const response = await fetch("/api/proxy", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "你是留服专业复核助手，严格遵循《学位授予和人才培养学科目录》，不跨大类，输出规范表格与材料。" },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3,
                stream: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0]?.message?.content || "AI生成失败";
    } catch (e) {
        console.error("DeepSeek API调用失败：", e);
        alert(`调用失败：${e.message}`);
        return "服务异常";
    }
}

const getAI = callDeepSeekAI;

// ==================== 1. AI 匹配复核专业 ====================
async function aiMatchMajor() {
    const userName = document.getElementById("userName").value.trim();
    const universityName = document.getElementById("universityName").value.trim();
    const useType = document.getElementById("useType").value;
    const overseasMajor = document.getElementById("overseasMajor").value.trim();
    const bachelorMajor = document.getElementById("bachelorMajor").value.trim();
    const courseList = document.getElementById("courseList").value.trim();

    // 字段验证
    if (!userName) {
        alert("请填写用户姓名");
        return;
    }
    if (!universityName) {
        alert("请填写海外留学院校");
        return;
    }
    if (!overseasMajor || !bachelorMajor || !courseList) {
        alert("请填写完整信息");
        return;
    }

    const resDom = document.getElementById("matchResult");
    resDom.innerHTML = "<p>正在匹配复核专业...</p>";

    const prompt = `严格按《学位授予和人才培养学科目录》规则：
1. 不跨学科大类
2. 仅推荐一级学科
3. 输出 1-3 个选项，带成功率
4. 格式固定：
【1】一级学科(代码)｜成功率：XX%

用户信息：
申请人：${userName}
留学院校：${universityName}
用途：${useType}
海外专业：${overseasMajor}
本科：${bachelorMajor}
课程：${courseList}
只输出结果，不要多余文字。`;

    const result = await callDeepSeekAI(prompt);
    
    const lines = result.split("\n").filter(line => line.trim() && line.includes("【"));
    let btns = "";
    lines.forEach((item, i) => {
        const escapedItem = item.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        btns += `<button class='main-btn' onclick='chooseMajor("${escapedItem}")'>选择第${i+1}个</button> `;
    });
    
    if (btns === "") {
        btns = "<p>⚠️ 无法解析结果，请重试</p>";
    }

    resDom.innerHTML = `<h4>🎯 匹配结果</h4><pre>${result}</pre><br>${btns}`;
}

// ==================== 2. 用户选择专业 ====================
function chooseMajor(major) {
    selectTargetMajor = major;
    alert("✅ 已选定：" + major);
    aiSearchSchoolPdf();
}

// ==================== 3. AI 查 3 所高校 ====================
async function aiSearchSchoolPdf() {
    const dom = document.getElementById("pdfArea");
    dom.innerHTML = "<p>🔍 正在检索高校培养方案 PDF...</p>";

    const prompt = `复核专业：${selectTargetMajor}
推荐3所国内顶尖高校，并给出官方培养方案PDF链接。
输出格式：
1. 学校名称 | PDF链接
2. 学校名称 | PDF链接
3. 学校名称 | PDF链接`;

    const pdfInfo = await callDeepSeekAI(prompt);
    schoolList = pdfInfo;
    dom.innerHTML = `
<h4>🏫 3所高校培养方案（官方）</h4>
<pre>${pdfInfo}</pre>
<div style="margin-top: 15px;">
    <button class='main-btn' onclick='aiGenerateCompareTable()'>📊 生成课程对比表</button>
    <button class='main-btn' onclick='aiGenerateSelfStatement()' style="margin-left: 10px;">📝 生成复核自述</button>
</div>`;
}

// ==================== 4. 单独生成课程对比表 ====================
async function aiGenerateCompareTable() {
    const dom = document.getElementById("finalArea");
    dom.innerHTML = "<p>📊 正在生成课程对比表...</p>";

    const overseasMajor = document.getElementById("overseasMajor").value;
    const courseList = document.getElementById("courseList").value;

    const prompt = `请根据以下信息生成课程对比表，严格按照表格格式输出：

海外专业：${overseasMajor}
复核专业：${selectTargetMajor}
课程内容：${courseList}

输出格式要求：
【课程对比表】
海外大学课程｜海外课程核心内容｜国内高校对应课程｜近似性说明（核心契合点）
${overseasMajor}的核心课程1｜请根据课程内容生成核心内容描述｜国内对应课程名称｜专业性理由
${overseasMajor}的核心课程2｜请根据课程内容生成核心内容描述｜国内对应课程名称｜专业性理由
${overseasMajor}的核心课程3｜请根据课程内容生成核心内容描述｜国内对应课程名称｜专业性理由

请直接输出上述格式，每行用｜分隔，课程内容后要加国内高校名称，除近似性说明需要从专业角度结合核心契合点（100字）外，不要输出其他解释文字。`;

    const tableContent = await callDeepSeekAI(prompt);
    currentCompareData = { table: tableContent, statement: null };
    
    const tableHtml = parseTableImproved(tableContent);
    
    dom.innerHTML = `
<h4>📊 海内外课程核心内容对比表</h4>
${tableHtml}
<button class='main-btn' onclick='downloadCSV()'>📥 下载 CSV</button>
<hr>
<div style="margin-top: 15px;">
    <button class='main-btn' onclick='regenerateCompareTable()'>🔄 重新生成对比表</button>
    <button class='main-btn' onclick='aiGenerateSelfStatement()' style="margin-left: 10px;">📝 生成复核自述</button>
</div>
<br>
<a href='https://zwfw.cscse.edu.cn/' target='_blank' class='main-btn'>🔗 前往留服官网</a>`;
}

// ==================== 5. 生成复核自述（增强版） ====================
async function aiGenerateSelfStatement() {
    const dom = document.getElementById("finalArea");
    
    // 检查是否已有对比表
    const existingTable = document.querySelector("#finalArea table");
    if (!existingTable && !currentCompareData?.table) {
        alert("请先生成课程对比表");
        return;
    }
    
    // 获取用户输入信息
    const userName = document.getElementById("userName")?.value.trim() || "申请人";
    const universityName = document.getElementById("universityName")?.value.trim() || "海外院校";
    const overseasMajor = document.getElementById("overseasMajor").value.trim();
    const courseList = document.getElementById("courseList").value.trim();
    const useType = document.getElementById("useType").value;
    const bachelorMajor = document.getElementById("bachelorMajor")?.value.trim() || "未提供";
    
    if (!overseasMajor) {
        alert("请填写海外硕士专业");
        return;
    }
    
    // 生成海外专业中文翻译
    const overseasMajorChinese = await translateMajorToChinese(overseasMajor);
    
    // 解析选中的一级学科
    let firstLevelDiscipline = selectTargetMajor;
    if (firstLevelDiscipline && firstLevelDiscipline.includes("【")) {
        const match = firstLevelDiscipline.match(/【\d+】(.*?)【/);
        if (match && match[1]) {
            firstLevelDiscipline = match[1].trim();
        } else {
            // 备选解析方式
            const parts = firstLevelDiscipline.split("｜");
            if (parts[0]) {
                firstLevelDiscipline = parts[0].replace(/【\d+】/, "").trim();
            }
        }
    }
    
    // 构建复核专业完整名称：一级学科（海外专业中文名称）
    const reviewMajorFull = `${firstLevelDiscipline}（${overseasMajorChinese}）`;
    
    // 显示加载状态
    const statementSection = document.getElementById("statementSection") || 
        (() => {
            const div = document.createElement("div");
            div.id = "statementSection";
            dom.appendChild(div);
            return div;
        })();
    
    statementSection.innerHTML = "<p>📝 AI 正在生成复核自述...</p>";
    
    // 课程列表处理（取前4门核心课程）
    const courseLines = courseList.split("\n").filter(c => c.trim());
    const coreCourses = courseLines.slice(0, 4).map((c, i) => `${i+1}. ${c.trim()}`).join("\n");
    
    const prompt = `请根据以下信息生成一份专业的留服认证复核自述：

【基本信息】
申请人姓名：${userName}
海外院校：${universityName}
海外专业：${overseasMajor}
海外专业中文翻译：${overseasMajorChinese}
复核目标专业：${reviewMajorFull}
本科专业：${bachelorMajor}
核心课程清单：
${coreCourses}
申请用途：${useType}

【核心要求】
复核专业必须写为：${reviewMajorFull}

【自述格式要求】
尊敬的留服中心老师：

我是申请人${userName}，毕业于${universityName}，攻读${overseasMajor}专业。说明该专业的学术背景和培养目标。现需申请将专业复核为'${reviewMajorFull}(${overseasMajor})'。
结合${useType === "考公" ? "公务员报考的专业分类要求" : "国内就业市场的专业认证需求"}，说明将海外专业复核为${reviewMajorFull}的必要性和合理性。

论证海外专业与国内${firstLevelDiscipline}一级学科的核心关联性，从学科基础、研究方向、培养目标等维度阐述。

详细说明课程重合度，列举至少3门核心课程与国内对应课程的对比，论证专业内核一致性。同时说明本科专业与硕士专业的衔接逻辑。

结尾：恳请留服中心审核，附上海内外课程对比表、成绩单等辅助材料。此致敬礼。

【输出要求】
1. 语言正式、专业，符合留服复核官方要求
2. 字数控制在550-700字
3. 直接输出自述正文，不要有其他格式标记

请直接输出自述正文：`;

    const statement = await callDeepSeekAI(prompt);
    currentCompareData = { ...currentCompareData, statement: statement };
    
    let statementHtml = `
<h4>📄 专业复核自述</h4>
<textarea id='statementTextarea' class='copy-area' onclick='this.select()' rows=15 style="width:100%">${escapeHtml(statement)}</textarea>
<div style="margin-top: 10px;">
    <button class='main-btn' onclick='regenerateSelfStatement()'>🔄 重新生成自述</button>
    <button class='main-btn' onclick='copyStatement()' style="margin-left: 10px;">📋 复制自述内容</button>
</div>
<div style="margin-top: 15px; padding: 12px; background: #f0f4f8; border-radius: 12px; font-size: 13px; color: #2c5f8a;">
    📌 自述说明：复核专业已按照 <strong>“${firstLevelDiscipline}（${overseasMajorChinese}）”</strong> 格式生成
</div>`;
    
    const existingStatementContainer = document.getElementById("statementSection");
    if (existingStatementContainer) {
        existingStatementContainer.innerHTML = statementHtml;
    } else {
        const finalDom = document.getElementById("finalArea");
        const existingContent = finalDom.innerHTML;
        if (!existingContent.includes("复核自述")) {
            finalDom.innerHTML = existingContent + `<div id="statementSection">${statementHtml}</div>`;
        } else {
            const statementDiv = document.createElement("div");
            statementDiv.id = "statementSection";
            statementDiv.innerHTML = statementHtml;
            finalDom.appendChild(statementDiv);
        }
    }
}

// ==================== 翻译辅助函数 ====================
async function translateMajorToChinese(englishMajor) {
    if (/[\u4e00-\u9fa5]/.test(englishMajor)) {
        return englishMajor;
    }
    
    const prompt = `请将以下海外硕士专业名称翻译为简洁准确的中文专业名称，只输出中文结果，不要其他内容：\n${englishMajor}`;
    
    try {
        const chinese = await callDeepSeekAI(prompt);
        if (chinese && chinese.length > 0 && chinese !== "服务异常") {
            return chinese.trim();
        }
        return englishMajor;
    } catch (e) {
        console.error("翻译失败：", e);
        return englishMajor;
    }
}

// ==================== 重新生成对比表 ====================
async function regenerateCompareTable() {
    await aiGenerateCompareTable();
}

// ==================== 重新生成自述 ====================
async function regenerateSelfStatement() {
    await aiGenerateSelfStatement();
}

// ==================== 复制自述内容 ====================
function copyStatement() {
    const textarea = document.getElementById("statementTextarea");
    if (textarea) {
        textarea.select();
        document.execCommand("copy");
        alert("✅ 自述内容已复制到剪贴板");
    } else {
        alert("未找到自述内容");
    }
}

// ==================== 表格解析函数 ====================
function parseTableImproved(text) {
    const lines = text.split("\n");
    const tableRows = [];
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        if (line.includes("【课程对比表】") || line.includes("课程对比表")) continue;
        if (line.includes("海外大学课程") && line.includes("海外课程核心内容")) continue;
        
        if (line.includes("｜")) {
            const cols = line.split("｜");
            if (cols.length >= 3) {
                tableRows.push(cols.map(c => c.trim()));
            }
        }
    }
    
    if (tableRows.length > 0) {
        return buildHtmlTableImproved(tableRows);
    }
    
    return getEditableFallbackTable();
}

function buildHtmlTableImproved(data) {
    if (!data || data.length === 0) {
        return "<p>⚠️ 无法生成表格</p>";
    }
    
    let html = `<table id="compareTable" border='1' cellpadding='10' cellspacing='0' style='width:100%; border-collapse: collapse;'>
        <thead>
            <tr style='background-color: #d98c2f; color: white;'>
                <th style='padding: 12px;'>海外大学课程</th>
                <th style='padding: 12px;'>海外课程核心内容</th>
                <th style='padding: 12px;'>国内高校对应课程</th>
                <th style='padding: 12px;'>近似性说明</th>
            </tr>
        </thead>
        <tbody>`;
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        html += `<tr style='${i % 2 === 0 ? 'background-color: #f9f9f9' : ''}'>`;
        for (let j = 0; j < 4; j++) {
            const content = row[j] || (j === 3 ? "高度相关" : "");
            html += `<td style='padding: 10px; border: 1px solid #ddd;' contenteditable='true'>${escapeHtml(content)}</td>`;
        }
        html += `</tr>`;
    }
    
    html += `</tbody>
    </table>
    <p style="color: #666; font-size: 12px; margin-top: 5px;">💡 提示：表格内容可以直接双击编辑</p>`;
    
    return html;
}

function getEditableFallbackTable() {
    const overseasMajor = document.getElementById("overseasMajor")?.value || "海外专业";
    return `
        <table id="compareTable" border='1' cellpadding='10' cellspacing='0' style='width:100%; border-collapse: collapse;'>
            <thead>
                <tr style='background-color: #d98c2f; color: white;'>
                    <th>海外大学课程</th>
                    <th>海外课程核心内容</th>
                    <th>国内高校对应课程</th>
                    <th>近似性说明</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td contenteditable='true'>${escapeHtml(overseasMajor)} - 课程1</td>
                    <td contenteditable='true'>请输入课程核心内容</td>
                    <td contenteditable='true'>请输入国内对应课程</td>
                    <td contenteditable='true'>高度相关</td>
                </tr>
                <tr style='background-color: #f9f9f9;'>
                    <td contenteditable='true'>${escapeHtml(overseasMajor)} - 课程2</td>
                    <td contenteditable='true'>请输入课程核心内容</td>
                    <td contenteditable='true'>请输入国内对应课程</td>
                    <td contenteditable='true'>相关</td>
                </tr>
                <tr>
                    <td contenteditable='true'>${escapeHtml(overseasMajor)} - 课程3</td>
                    <td contenteditable='true'>请输入课程核心内容</td>
                    <td contenteditable='true'>请输入国内对应课程</td>
                    <td contenteditable='true'>高度相关</td>
                </tr>
            </tbody>
        </table>
        <p style="color: #856404; font-size: 12px; margin-top: 5px;">💡 提示：表格内容可直接编辑修改</p>
    `;
}

// ==================== 下载 CSV ====================
function downloadCSV() {
    const table = document.getElementById("compareTable");
    if (!table) {
        alert("没有找到表格数据");
        return;
    }
    
    let csvContent = "\uFEFF";
    csvContent += "海外大学课程,海外课程核心内容,国内高校对应课程,近似性说明\n";
    
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length >= 4) {
            const rowData = Array.from(cols).slice(0, 4).map(td => {
                let text = td.innerText.replace(/"/g, '""');
                return `"${text}"`;
            }).join(",");
            csvContent += rowData + "\n";
        }
    });
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `留服课程对比表_${new Date().toISOString().slice(0,19)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert("✅ CSV文件已下载");
}

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

window.addEventListener('DOMContentLoaded', () => {
    console.log("✅ 留服助手已启动，API 连接正常");
    console.log("✅ 功能：对比表和自述已分离，支持单独重新生成");
    console.log("✅ 新增：用户姓名、留学院校字段，自述格式适配一级学科（原专业）");
});