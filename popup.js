// DOM元素
const extractBtn = document.getElementById('extractBtn');
const extractText = document.getElementById('extractText');
const loadingText = document.getElementById('loadingText');
const results = document.getElementById('results');
const error = document.getElementById('error');
const status = document.getElementById('status');

const titleResult = document.getElementById('titleResult');
const mainImagesResult = document.getElementById('mainImagesResult');
const detailImagesResult = document.getElementById('detailImagesResult');
const mainImageCount = document.getElementById('mainImageCount');
const detailImageCount = document.getElementById('detailImageCount');

const downloadMainImages = document.getElementById('downloadMainImages');
const downloadDetailImages = document.getElementById('downloadDetailImages');
const downloadAll = document.getElementById('downloadAll');

let currentData = null;

// 检查当前页面是否为淘宝页面
function checkTaobaoPage() {
    return new Promise((resolve) => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                const url = tabs[0].url;
                const isTaobao = url.includes('taobao.com') || url.includes('tmall.com');
                resolve(isTaobao);
            } else {
                resolve(false);
            }
        });
    });
}

// 显示错误信息
function showError(message) {
    error.textContent = message;
    error.style.display = 'block';
    results.style.display = 'none';
    hideLoading();
}

// 显示状态信息
function showStatus(message) {
    status.textContent = message;
}

// 显示加载状态
function showLoading() {
    extractText.style.display = 'none';
    loadingText.style.display = 'inline';
    extractBtn.disabled = true;
}

// 隐藏加载状态
function hideLoading() {
    extractText.style.display = 'inline';
    loadingText.style.display = 'none';
    extractBtn.disabled = false;
}

// 创建图片元素
function createImageElement(src, index, type) {
    const container = document.createElement('div');
    container.className = 'image-item';
    
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${type} ${index + 1}`;
    img.onclick = () => downloadSingleImage(src, `${type}_${index + 1}`);
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = '下载';
    downloadBtn.onclick = (e) => {
        e.stopPropagation();
        downloadSingleImage(src, `${type}_${index + 1}`);
    };
    
    container.appendChild(img);
    container.appendChild(downloadBtn);
    
    return container;
}

// 显示提取结果
function displayResults(data) {
    currentData = data;
    
    // 显示标题
    titleResult.textContent = data.title || '未找到标题';
    
    // 显示价格和销量信息
    const priceInfo = document.getElementById('priceInfo');
    if (priceInfo) {
        let priceText = '';
        if (data.price.current) priceText += `当前价格: ${data.price.current}`;
        if (data.price.original) priceText += ` (原价: ${data.price.original})`;
        if (data.price.discount) priceText += ` ${data.price.discount}`;
        if (data.sales) priceText += ` | 销量: ${data.sales}`;
        priceInfo.textContent = priceText || '未找到价格信息';
    }
    
    // 显示主图
    mainImagesResult.innerHTML = '';
    mainImageCount.textContent = data.mainImages.length;
    data.mainImages.forEach((src, index) => {
        const imageEl = createImageElement(src, index, '主图');
        mainImagesResult.appendChild(imageEl);
    });
    
    // 显示详情图
    detailImagesResult.innerHTML = '';
    detailImageCount.textContent = data.detailImages.length;
    data.detailImages.forEach((src, index) => {
        const imageEl = createImageElement(src, index, '详情图');
        detailImagesResult.appendChild(imageEl);
    });
    
    // 显示结果区域
    results.style.display = 'block';
    error.style.display = 'none';
    
    // 如果有批量数据，显示批量处理区域
    if (batchData.length > 0) {
        document.getElementById('batchSection').style.display = 'block';
    }
    
    showStatus(`成功提取: 标题1个，主图${data.mainImages.length}张，详情图${data.detailImages.length}张`);
}

// 下载单张图片
function downloadSingleImage(url, filename) {
    chrome.downloads.download({
        url: url,
        filename: `taobao_images/${filename}.jpg`,
        saveAs: false
    }, (downloadId) => {
        if (chrome.runtime.lastError) {
            showStatus(`下载失败: ${chrome.runtime.lastError.message}`);
        } else {
            showStatus(`正在下载: ${filename}.jpg`);
        }
    });
}

// 批量下载图片
function downloadImages(images, type) {
    if (images.length === 0) {
        showStatus('没有可下载的图片');
        return;
    }
    
    images.forEach((url, index) => {
        setTimeout(() => {
            downloadSingleImage(url, `${type}_${index + 1}`);
        }, index * 500); // 延迟下载避免并发过多
    });
    
    showStatus(`开始下载${images.length}张${type}`);
}

// 下载所有内容
function downloadAllContent() {
    if (!currentData) return;
    
    // 保存商品信息为文本文件
    const info = `商品标题: ${currentData.title}
当前价格: ${currentData.price.current}
原价: ${currentData.price.original}
折扣: ${currentData.price.discount}
销量: ${currentData.sales}
商品链接: ${currentData.url}
抓取时间: ${currentData.extractTime}
主图数量: ${currentData.mainImages.length}
详情图数量: ${currentData.detailImages.length}

主图链接:
${currentData.mainImages.join('\n')}

详情图链接:
${currentData.detailImages.join('\n')}`;
    
    const blob = new Blob([info], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
        url: url,
        filename: 'taobao_images/商品信息.txt',
        saveAs: false
    });
    
    // 下载所有图片
    downloadImages(currentData.mainImages, '主图');
    setTimeout(() => {
        downloadImages(currentData.detailImages, '详情图');
    }, currentData.mainImages.length * 500 + 1000);
}

// 导出为JSON格式
function exportToJSON() {
    if (!currentData) return;
    
    const jsonData = JSON.stringify(currentData, null, 2);
    const blob = new Blob([jsonData], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    chrome.downloads.download({
        url: url,
        filename: `taobao_export/product_${timestamp}.json`,
        saveAs: false
    });
    
    showStatus('JSON文件导出完成');
}

// 导出为CSV格式
function exportToCSV() {
    if (!currentData) return;
    
    const csvData = [
        ['字段', '值'],
        ['商品标题', currentData.title],
        ['当前价格', currentData.price.current],
        ['原价', currentData.price.original],
        ['折扣', currentData.price.discount],
        ['销量', currentData.sales],
        ['商品链接', currentData.url],
        ['抓取时间', currentData.extractTime],
        ['主图数量', currentData.mainImages.length],
        ['详情图数量', currentData.detailImages.length],
        ['主图链接', currentData.mainImages.join('; ')],
        ['详情图链接', currentData.detailImages.join('; ')]
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    
    const blob = new Blob(['\ufeff' + csvData], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    chrome.downloads.download({
        url: url,
        filename: `taobao_export/product_${timestamp}.csv`,
        saveAs: false
    });
    
    showStatus('CSV文件导出完成');
}

// 导出为Excel格式
function exportToExcel() {
    if (!currentData) return;
    
    // 准备Excel数据
    const excelData = [
        ['字段', '值'],
        ['商品标题', currentData.title],
        ['当前价格', currentData.price.current],
        ['原价', currentData.price.original],
        ['折扣', currentData.price.discount],
        ['销量', currentData.sales],
        ['商品链接', currentData.url],
        ['抓取时间', currentData.extractTime],
        ['主图数量', currentData.mainImages.length],
        ['详情图数量', currentData.detailImages.length],
        [],
        ['主图链接'],
        ...currentData.mainImages.map(img => [img]),
        [],
        ['详情图链接'],
        ...currentData.detailImages.map(img => [img])
    ];
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, '商品信息');
    
    // 导出文件
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const excelContent = XLSX.write(wb, { type: 'string', bookType: 'csv' });
    const blob = new Blob([excelContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
        url: url,
        filename: `taobao_export/product_${timestamp}.csv`,
        saveAs: false
    });
    
    showStatus('Excel文件导出完成');
}

// 批量数据存储
let batchData = [];

// 添加到批量数据
function addToBatch() {
    if (!currentData) return;
    
    const existingIndex = batchData.findIndex(item => item.url === currentData.url);
    if (existingIndex > -1) {
        batchData[existingIndex] = { ...currentData };
        showStatus('已更新批量数据中的商品信息');
    } else {
        batchData.push({ ...currentData });
        showStatus(`已添加到批量数据 (${batchData.length}个商品)`);
    }
    
    // 保存到storage
    chrome.storage.local.set({ batchData: batchData });
    updateBatchCount();
    
    // 显示批量处理区域
    document.getElementById('batchSection').style.display = 'block';
}

// 清空批量数据
function clearBatch() {
    batchData = [];
    chrome.storage.local.set({ batchData: [] });
    showStatus('批量数据已清空');
    updateBatchCount();
    
    // 隐藏批量处理区域
    document.getElementById('batchSection').style.display = 'none';
}

// 导出批量数据
function exportBatchData(format) {
    if (batchData.length === 0) {
        showStatus('批量数据为空');
        return;
    }
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    if (format === 'json') {
        const jsonData = JSON.stringify(batchData, null, 2);
        const blob = new Blob([jsonData], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `taobao_export/batch_${timestamp}.json`,
            saveAs: false
        });
    } else if (format === 'csv') {
        const headers = ['商品标题', '当前价格', '原价', '折扣', '销量', '主图数量', '详情图数量', '商品链接', '抓取时间'];
        const rows = batchData.map(item => [
            item.title,
            item.price.current,
            item.price.original,
            item.price.discount,
            item.sales,
            item.mainImages.length,
            item.detailImages.length,
            item.url,
            item.extractTime
        ]);
        
        const csvData = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
        
        const blob = new Blob(['\ufeff' + csvData], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `taobao_export/batch_${timestamp}.csv`,
            saveAs: false
        });
    } else if (format === 'excel') {
        const headers = ['商品标题', '当前价格', '原价', '折扣', '销量', '主图数量', '详情图数量', '商品链接', '抓取时间'];
        const rows = batchData.map(item => [
            item.title,
            item.price.current,
            item.price.original,
            item.price.discount,
            item.sales,
            item.mainImages.length,
            item.detailImages.length,
            item.url,
            item.extractTime
        ]);
        
        const excelData = [headers, ...rows];
        
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, '批量商品数据');
        
        // 导出文件
        const excelContent = XLSX.write(wb, { type: 'string', bookType: 'csv' });
        const blob = new Blob([excelContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `taobao_export/batch_${timestamp}.csv`,
            saveAs: false
        });
    }
    
    showStatus(`批量${format.toUpperCase()}文件导出完成 (${batchData.length}个商品)`);
}

// 更新批量数据计数显示
function updateBatchCount() {
    const countElement = document.getElementById('batchCount');
    if (countElement) {
        countElement.textContent = batchData.length;
    }
}

// 提取数据
async function extractData() {
    const isTaobao = await checkTaobaoPage();
    
    if (!isTaobao) {
        showError('请在淘宝或天猫商品详情页使用此插件');
        return;
    }
    
    showLoading();
    error.style.display = 'none';
    results.style.display = 'none';
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'extractData'}, (response) => {
            hideLoading();
            
            if (chrome.runtime.lastError) {
                showError('无法连接到页面脚本，请刷新页面后重试');
                return;
            }
            
            if (response && response.success) {
                displayResults(response.data);
            } else {
                showError(response ? response.error : '提取失败，请确保页面已完全加载');
            }
        });
    });
}

// 事件监听器
extractBtn.addEventListener('click', extractData);
downloadMainImages.addEventListener('click', () => {
    if (currentData) {
        downloadImages(currentData.mainImages, '主图');
    }
});
downloadDetailImages.addEventListener('click', () => {
    if (currentData) {
        downloadImages(currentData.detailImages, '详情图');
    }
});
downloadAll.addEventListener('click', downloadAllContent);

// 新功能事件监听器
document.getElementById('exportJSON').addEventListener('click', exportToJSON);
document.getElementById('exportCSV').addEventListener('click', exportToCSV);
document.getElementById('exportExcel').addEventListener('click', exportToExcel);
document.getElementById('addToBatch').addEventListener('click', addToBatch);
document.getElementById('exportBatchJSON').addEventListener('click', () => exportBatchData('json'));
document.getElementById('exportBatchCSV').addEventListener('click', () => exportBatchData('csv'));
document.getElementById('exportBatchExcel').addEventListener('click', () => exportBatchData('excel'));
document.getElementById('clearBatch').addEventListener('click', clearBatch);
downloadAll.addEventListener('click', downloadAllContent);

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    const isTaobao = await checkTaobaoPage();
    if (!isTaobao) {
        showError('请在淘宝或天猫商品详情页使用此插件');
        extractBtn.disabled = true;
    }
    
    // 加载批量数据
    chrome.storage.local.get(['batchData'], (result) => {
        if (result.batchData) {
            batchData = result.batchData;
            updateBatchCount();
            if (batchData.length > 0) {
                document.getElementById('batchSection').style.display = 'block';
            }
        }
    });
});