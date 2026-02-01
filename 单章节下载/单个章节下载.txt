// 在浏览器控制台(F12)粘贴此代码
(async function() {
  // 解除网站封锁
  document.oncontextmenu = null;
  document.onselectstart = null;
  document.onmousedown = null;
  
  // 获取当前域名
  const domain = window.location.origin;
  
  // 智能获取书名
  const getTitle = () => {
    const titleElement = document.querySelector('h1.page-title');
    return titleElement 
      ? titleElement.innerText
          .replace(/[\\/:*?"<>|【】]/g, '')
          .substring(0, 40)
          .trim() || 'diyibanzhu小说'
      : 'diyibanzhu小说';
  };

  // 获取所有分页链接
  const getPageLinks = () => {
    const pages = document.querySelector('.chapterPages');
    if (!pages) return [window.location.href];
    
    const links = [];
    const pageElements = pages.querySelectorAll('a, span.curr');
    
    pageElements.forEach(el => {
      if (el.tagName === 'A') {
        links.push(domain + el.getAttribute('href'));
      } else if (el.classList.contains('curr')) {
        links.push(window.location.href);
      }
    });
    
    // 去重并排序
    return [...new Set(links)].sort((a, b) => {
      const aNum = parseInt(a.match(/_(\d+)/)?.[1] || '0');
      const bNum = parseInt(b.match(/_(\d+)/)?.[1] || '0');
      return aNum - bNum;
    });
  };

  // 高级内容清洗
  const cleanContent = (text) => {
    // 删除分页提示和导航代码
    return text
      .replace(/\s*<font color="blue">本章未完，点击\[ \d+ \]分页继续阅读--&gt;&gt;<\/font>/gi, '')
      .replace(/\s*<center class="chapterPages">[\s\S]*?<\/center>/gi, '')
      .replace(/\s*点击\[ \d+ \]分页继续阅读/g, '')
      .replace(/\s*--&gt;&gt;/g, '')
      .replace(/\s*地址发布页[^\n]+/g, '')
      .replace(/\s*拉倒底部可以下载安卓APP[^\n]+/g, '')
      .replace(/\s*APP网址部分手机无法打开[^\n]+/g, '')
      .replace(/\s*23-04-03/g, '')
      .replace(/\s*作者：[^\n]+/g, '')
      .replace(/\s*本章完\s*/g, '')
      .replace(/\s*下一章\s*/g, '')
      .replace(/"([^"]+)"/g, '$1')  // 移除英文引号
      .replace(/\s{2,}/g, '\n')    // 多个空格转行
      .trim();
  };

  // 抓取单页内容
  const fetchPageContent = async (url) => {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // 提取内容
      const contentDiv = doc.getElementById('nr1');
      if (!contentDiv) return '';
      
      // 获取原始HTML进行精准清洗
      let rawHtml = contentDiv.innerHTML;
      
      // 执行高级清洗
      return cleanContent(rawHtml)
        // 转换HTML换行
        .replace(/<br\s*\/?>/gi, '\n')
        // 移除残留HTML标签
        .replace(/<[^>]+>/g, '')
        // 最终整理
        .replace(/\n{3,}/g, '\n\n');
    } catch (e) {
      console.error(`抓取失败: ${url}`, e);
      return '';
    }
  };

  // 主执行函数
  const main = async () => {
    const bookTitle = getTitle();
    const pageLinks = getPageLinks();
    console.log(`📚 检测到 ${pageLinks.length} 个分页`);
    
    let fullContent = `《${bookTitle}》\n\n`;
    let currentPage = 1;
    
    for (const link of pageLinks) {
      console.log(`⏳ 抓取中 (${currentPage}/${pageLinks.length}): ${link}`);
      const pageContent = await fetchPageContent(link);
      
      fullContent += pageContent + '\n\n';
      currentPage++;
    }
    
    // 最终清洗
    fullContent = fullContent
      .replace(/\n{3,}/g, '\n\n')  // 移除多余空行
      .replace(/(第[一二三四五六七八九十百千]+章)/g, '\n\n$1\n\n');  // 章节标题加空行
    
    // 生成下载
    const fileName = `${bookTitle}.txt`;
    const blob = new Blob([fullContent], {type: 'text/plain;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    
    console.log(`✅ 小说下载完成！共 ${pageLinks.length} 页`);
    console.log(`📖 文件名: ${fileName}`);
    console.log(`📊 文件大小: ${(blob.size/1024).toFixed(1)}KB`);
    
    return `success:${fileName}`;
  };

  // 执行
  try {
    await main();
  } catch (e) {
    console.error('❌ 全局错误:', e);
    alert(`下载失败: ${e.message}`);
  }
})();