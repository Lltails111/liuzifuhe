// schools-processed.js - 处理后的高校数据（支持中英文检索）
window.SchoolsDatabase = [
    // 数据会从这里加载
];

// 中英文名称映射表（常见中国高校的英文名 → 中文名）
const ChineseNameMap = {
    "Sun Yat-Sen University": "中山大学",
    "Hunan University": "湖南大学",
    "Xihua University": "西华大学",
    "Chengdu University of Electronic Science and Technology of China": "电子科技大学成都学院",
    "Shanghai Jiao Tong University": "上海交通大学",
    "Nanjing University of Information Science and Technology": "南京信息工程大学",
    "Luoyang Normal University": "洛阳师范学院",
    "Shenyang Agricultural University": "沈阳农业大学",
    "Xiamen University": "厦门大学",
    "Wuhan University": "武汉大学",
    "Zhejiang University": "浙江大学",
    "Tsinghua University": "清华大学",
    "Peking University": "北京大学",
    "Fudan University": "复旦大学",
    "Nanjing University": "南京大学",
    "University of Hong Kong": "香港大学",
    "Chinese University of Hong Kong": "香港中文大学",
    "University of Macau": "澳门大学",
    "National Taiwan University": "国立台湾大学"
};

// 构建检索用的数据结构
function buildSearchableSchools(schools) {
    return schools.map(school => ({
        name: school.name,
        nameCn: ChineseNameMap[school.name] || generateChineseName(school.name),
        country: school.country,
        countryCn: getCountryChinese(school.country),
        domains: school.domains || [],
        web_pages: school.web_pages || []
    }));
}

// 简单的中文名称生成（基于关键词）
function generateChineseName(englishName) {
    // 提取大学名称的关键部分
    if (englishName.includes("University of")) {
        return englishName.replace("University of", "") + "大学";
    }
    if (englishName.includes("University")) {
        return englishName.replace("University", "大学");
    }
    if (englishName.includes("College")) {
        return englishName.replace("College", "学院");
    }
    return englishName;
}

// 国家名称中英文映射
function getCountryChinese(country) {
    const countryMap = {
        "United States": "美国",
        "United Kingdom": "英国",
        "Canada": "加拿大",
        "Australia": "澳大利亚",
        "China": "中国",
        "France": "法国",
        "Germany": "德国",
        "Japan": "日本",
        "South Korea": "韩国",
        "India": "印度",
        "Singapore": "新加坡",
        "Hong Kong": "香港",
        "Taiwan, Province of China": "台湾",
        "Macao": "澳门"
    };
    return countryMap[country] || country;
}