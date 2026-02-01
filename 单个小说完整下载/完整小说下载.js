// 在浏览器控制台中运行此代码
// 1. 首先导航到小说网站的章节列表页面
// 2. 复制粘贴以下代码到控制台并按回车执行

// 创建下载文件的功能
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// 清理文件名函数 - 删除多余部分
function cleanFileName(title) {
    // 定义要删除的模式
    const patterns = [
        /最新章节$/,
        /新书作品$/,
        /_小说$/,
        /第一版主网$/,
        /完整小说$/,
        /作品$/,
        /小说$/,
        /\s*[-_|]\s*/g,
        /\*\*\*\*\*/g
    ];
    
    // 应用所有清理规则
    let cleanTitle = title;
    patterns.forEach(pattern => {
        cleanTitle = cleanTitle.replace(pattern, '');
    });
    
    // 删除首尾空白和特殊字符
    cleanTitle = cleanTitle
        .replace(/^[_\s]+|[_\s]+$/g, '') // 删除首尾下划线和空格
        .replace(/\s{2,}/g, ' ')          // 合并多个空格
        .trim();
    
    // 如果清理后为空，返回原始标题
    return cleanTitle || title;
}

// 主提取函数
async function extractNovel() {
    // 获取所有章节列表容器
    const chapterContainers = document.querySelectorAll('.mod.block.update.chapter-list');
    
    if (chapterContainers.length < 2) {
        console.error('未找到第二个章节列表容器');
        return;
    }
    
    // 选择第二个章节列表容器（索引为1）
    const chapterList = chapterContainers[1];
    console.log('已选择第二个章节列表容器');

    const chapters = [];
    // 获取该容器中的所有章节链接
    const chapterLinks = chapterList.querySelectorAll('a');
    
    if (chapterLinks.length === 0) {
        console.error('在容器中未找到章节链接');
        return;
    }
    
    console.log(`找到 ${chapterLinks.length} 个章节`);
    
    for (let i = 0; i < chapterLinks.length; i++) {
        const link = chapterLinks[i];
        const title = link.textContent.trim();
        const url = link.href;
        
        console.log(`正在下载第 ${i+1}/${chapterLinks.length} 章: ${title}`);
        
        try {
            // 获取章节内容
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            let chapterContent = '';
            let currentPageUrl = url;
            let pageCount = 1;
            let hasNextPage = true;
            
            // 处理分页 - 直到没有下一页
            while (hasNextPage && pageCount < 50) { // 设置最大页数防止无限循环
                console.log(`正在下载第${pageCount}页: ${title}`);
                const pageResponse = await fetch(currentPageUrl);
                const pageHtml = await pageResponse.text();
                const pageDoc = parser.parseFromString(pageHtml, 'text/html');
                
                // 提取主要内容
                const contentDiv = pageDoc.getElementById('nr1');
                if (contentDiv) {
                    // 克隆内容以避免修改原始DOM
                    const cleanDiv = contentDiv.cloneNode(true);
                    
                    // 移除不需要的元素
                    const unwantedElements = [
                        ...cleanDiv.querySelectorAll('font[color="blue"]'),
                        ...cleanDiv.querySelectorAll('center.chapterPages')
                    ];
                    
                    unwantedElements.forEach(el => el.remove());
                    
                    // 添加内容
                    chapterContent += cleanDiv.textContent.trim() + '\n\n';
                } else {
                    console.warn(`未找到内容区域: ${currentPageUrl}`);
                }
                
                // 检查分页控件是否存在
                const pagination = pageDoc.querySelector('center.chapterPages');
                if (!pagination) {
                    console.log('未找到分页控件，结束本章');
                    hasNextPage = false;
                    break;
                }
                
                // 检查是否有下一页
                let nextPageUrl = null;
                
                // 方法1：检查是否有数字分页链接
                const pageLinks = pagination.querySelectorAll('a');
                const currentPageSpan = pagination.querySelector('span.curr');
                
                // 如果有当前页码标记
                if (currentPageSpan) {
                    const currentPageText = currentPageSpan.textContent.trim();
                    const currentPageNum = parseInt(currentPageText.replace(/\D/g, ''));
                    
                    if (!isNaN(currentPageNum)) {
                        // 查找下一页数字链接
                        for (const pageLink of pageLinks) {
                            const pageText = pageLink.textContent.trim();
                            const pageNum = parseInt(pageText.replace(/\D/g, ''));
                            
                            if (!isNaN(pageNum) && pageNum === currentPageNum + 1) {
                                nextPageUrl = pageLink.href;
                                break;
                            }
                        }
                    }
                }
                
                // 方法2：检查是否有"下一页"文字链接
                if (!nextPageUrl) {
                    const nextPageLink = Array.from(pageLinks).find(link => 
                        link.textContent.includes('下一页') || 
                        link.textContent.includes('下一章') || 
                        link.textContent.includes('下页')
                    );
                    
                    if (nextPageLink) {
                        nextPageUrl = nextPageLink.href;
                    }
                }
                
                // 方法3：检查是否有数字大于当前页码的链接
                if (!nextPageUrl && currentPageSpan) {
                    // 找到当前页的位置
                    const children = Array.from(pagination.children);
                    const currentIndex = children.indexOf(currentPageSpan);
                    
                    // 尝试获取下一个元素
                    if (currentIndex !== -1 && currentIndex < children.length - 1) {
                        const nextElement = children[currentIndex + 1];
                        if (nextElement.tagName === 'A') {
                            nextPageUrl = nextElement.href;
                        }
                    }
                }
                
                // 检查是否还有下一页
                if (nextPageUrl) {
                    // 处理相对URL
                    if (!nextPageUrl.startsWith('http')) {
                        const base = new URL(currentPageUrl);
                        nextPageUrl = new URL(nextPageUrl, base.origin).href;
                    }
                    
                    // 检查是否是新的URL
                    if (nextPageUrl !== currentPageUrl) {
                        currentPageUrl = nextPageUrl;
                        pageCount++;
                    } else {
                        hasNextPage = false;
                    }
                } else {
                    hasNextPage = false;
                }
                
                // 添加延迟避免请求过快
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            
            chapters.push({
                title,
                content: chapterContent
            });
            
            console.log(`章节 "${title}" 下载完成 (${pageCount}页)`);
        } catch (error) {
            console.error(`下载章节失败: ${title}`, error);
        }
        
        // 添加章节间延迟
        await new Promise(resolve => setTimeout(resolve, 1200));
    }
    
    // 组合所有章节内容
    let fullContent = '';
    chapters.forEach((chapter, index) => {
        fullContent += `第${index + 1}章: ${chapter.title}\n\n`;
        fullContent += chapter.content;
        fullContent += '\n\n' + '='.repeat(50) + '\n\n';
    });
    
    // 清理文件名
    let fileName = document.title;
    
    // 尝试获取更精确的小说名称
    const novelTitleElement = document.querySelector('h1, h2, .title, .novel-title');
    if (novelTitleElement) {
        fileName = novelTitleElement.textContent;
    }
    
    // 应用清理规则
    fileName = cleanFileName(fileName);
    
    // 确保文件名有效
    if (!fileName) fileName = '小说全文';
    
    // 添加后缀
    fileName += '.txt';
    
    // 替换非法字符
    fileName = fileName.replace(/[\\/:*?"<>|\s]/g, '_');
    
    // 下载完整小说
    downloadFile(fullContent, fileName);
    console.log(`小说下载完成! 文件名: ${fileName}`);
}

// 开始提取
extractNovel();