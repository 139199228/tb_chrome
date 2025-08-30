// 淘宝商品信息提取器
class TaobaoExtractor {
  constructor() {
    this.productData = {
      title: '',
      price: {
        current: '',
        original: '',
        discount: ''
      },
      sales: '',
      mainImages: [],
      detailImages: [],
      url: window.location.href,
      extractTime: new Date().toISOString()
    };
  }

  // 提取商品标题
  extractTitle() {
    const titleSelectors = [
      // 用户提供的具体路径
      '/html/body/div[2]/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div[1]/div/div/div[1]/span',
      // 其他可能的选择器
      '.tb-detail-hd h1',
      '[data-spm="1000983"] h1',
      '.itemTitle',
      '.tb-main-title',
      'h1[data-spm-anchor-id]',
      'h1.tb-main-title',
      // 通用选择器
      'h1',
      '.title',
      '[class*="title"]',
      '[class*="Title"]'
    ];

    for (const selector of titleSelectors) {
      let element;
      
      // 如果是XPath路径，转换为CSS选择器或直接查找
      if (selector.startsWith('/html')) {
        try {
          const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          element = result.singleNodeValue;
        } catch (e) {
          console.log('XPath查询失败:', e);
          continue;
        }
      } else {
        element = document.querySelector(selector);
      }
      
      if (element && element.textContent && element.textContent.trim()) {
        this.productData.title = element.textContent.trim();
        console.log('找到标题:', this.productData.title);
        break;
      }
    }
    
    // 如果还是没找到，尝试模糊匹配
    if (!this.productData.title) {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.children.length === 0 && 
            el.textContent && 
            el.textContent.trim().length > 10 && 
            el.textContent.trim().length < 200 &&
            !el.textContent.includes('价格') &&
            !el.textContent.includes('¥') &&
            !el.textContent.includes('元')) {
          this.productData.title = el.textContent.trim();
          console.log('模糊匹配找到标题:', this.productData.title);
          break;
        }
      }
    }
  }

  // 提取主图（商品展示图）
  extractMainImages() {
    const mainImageSelectors = [
      // 用户提供的具体路径
      '/html/body/div[2]/div/div[2]/div[1]/div[2]/div[1]/div[2]/div[1]/div[1]/div',
      // 其他可能的选择器
      '.tb-gallery img',
      '.tb-pic img',
      '#J_UlThumb img',
      '.tb-s40 img',
      '.tb-thumb img',
      '.tb-gallery .tb-pic img'
    ];

    const imageSet = new Set();

    for (const selector of mainImageSelectors) {
      let elements = [];
      
      // 如果是XPath路径
      if (selector.startsWith('/html')) {
        try {
          const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const containerElement = result.singleNodeValue;
          if (containerElement) {
            // 在容器内查找所有图片
            elements = containerElement.querySelectorAll('img');
            console.log('通过XPath找到主图容器，包含图片数量:', elements.length);
          }
        } catch (e) {
          console.log('XPath查询失败:', e);
          continue;
        }
      } else {
        elements = document.querySelectorAll(selector);
      }
      
      elements.forEach(img => {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src');
        if (src && (src.includes('img.alicdn.com') || src.includes('gd') || src.startsWith('http'))) {
          // 获取高清版本
          let cleanSrc = src.replace(/_\d+x\d+\./, '_800x800.');
          if (!cleanSrc.includes('_800x800')) {
            cleanSrc = src;
          }
          imageSet.add(cleanSrc);
          console.log('找到主图:', cleanSrc);
        }
      });
    }

    // 如果通过XPath没找到，尝试更广泛的搜索
    if (imageSet.size === 0) {
      const allImages = document.querySelectorAll('img');
      allImages.forEach(img => {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
        if (src && src.includes('img.alicdn.com') && 
            (img.width > 50 || img.height > 50) &&
            !src.includes('avatar') && 
            !src.includes('icon')) {
          let cleanSrc = src.replace(/_\d+x\d+\./, '_400x400.');
          imageSet.add(cleanSrc);
        }
      });
    }

    this.productData.mainImages = Array.from(imageSet);
    console.log('主图总数:', this.productData.mainImages.length);
  }

  // 提取详情页图片
  async extractDetailImages() {
    const imageSet = new Set();

    // 使用两种方式查找详情容器：XPath和ID选择器
    let detailContainer = null;
    
    // 方法1：使用XPath
    try {
      const xpath = '/html/body/div[2]/div/div[2]/div[1]/div[2]/div[1]/div[3]/div[3]/div[3]/div[1]/div';
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      detailContainer = result.singleNodeValue;
      console.log('XPath查找详情容器:', detailContainer);
    } catch (e) {
      console.log('XPath查询失败:', e);
    }
    
    // 方法2：使用ID选择器作为备选
    if (!detailContainer) {
      detailContainer = document.querySelector('#content');
      console.log('ID选择器查找详情容器:', detailContainer);
    }

    if (detailContainer) {
      // 只在这个特定容器内查找图片
      const images = detailContainer.querySelectorAll('img');
      console.log(`在详情容器中找到 ${images.length} 个图片元素`);
      
      images.forEach((img, index) => {
        // 获取图片源地址
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src');
        
        if (src) {
          // 基本过滤：确保是阿里云图片
          if (src.includes('img.alicdn.com') || src.includes('alicdn.com')) {
            // 处理协议相对URL
            let finalSrc = src.startsWith('//') ? 'https:' + src : src;
            imageSet.add(finalSrc);
            console.log(`详情图 ${index + 1}:`, finalSrc);
          } else {
            console.log(`跳过非阿里云图片:`, src);
          }
        }
      });
    } else {
      console.log('未找到详情图容器');
    }

    this.productData.detailImages = Array.from(imageSet);
    console.log('详情图总数:', this.productData.detailImages.length);
  }

  // 提取价格信息
  extractPrice() {
    const priceSelectors = [
      // 天猫价格XPath路径
      '/html/body/div[2]/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div[2]/div[1]/div[3]/div[1]/div[1]/div[1]/span[3]',
      // 淘宝价格XPath路径  
      '/html/body/div[2]/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div[2]/div/div[3]/div/div[1]/span[2]',
      // 其他通用选择器
      '.tm-price-current .tm-price-num',
      '.tb-rmb-num',
      '.tm-price .tm-price-num',
      '[class*="price"] [class*="num"]',
      '.price .num',
      '.tm-price-panel .tm-price-current .tm-price-num'
    ];

    const originalPriceSelectors = [
      '.tm-price-original .tm-price-num',
      '.tb-price-original .tb-price-num',
      '[class*="original"] [class*="num"]',
      '.original-price .num'
    ];

    // 提取当前价格
    for (const selector of priceSelectors) {
      let element;
      
      // 如果是XPath路径
      if (selector.startsWith('/html')) {
        try {
          const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          element = result.singleNodeValue;
        } catch (e) {
          console.log('价格XPath查询失败:', e);
          continue;
        }
      } else {
        element = document.querySelector(selector);
      }
      
      if (element && element.textContent && element.textContent.trim()) {
        this.productData.price.current = element.textContent.trim();
        console.log('找到当前价格:', this.productData.price.current);
        break;
      }
    }

    // 提取原价
    for (const selector of originalPriceSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        this.productData.price.original = element.textContent.trim();
        console.log('找到原价:', this.productData.price.original);
        break;
      }
    }

    // 如果没找到具体价格，尝试通用搜索
    if (!this.productData.price.current) {
      const priceElements = document.querySelectorAll('*');
      for (const el of priceElements) {
        if (el.children.length === 0 && el.textContent) {
          const text = el.textContent.trim();
          if (/^¥?\s*\d+(\.\d{1,2})?$/.test(text) || /^\d+(\.\d{1,2})?\s*元?$/.test(text)) {
            this.productData.price.current = text;
            console.log('通用搜索找到价格:', text);
            break;
          }
        }
      }
    }

    // 计算折扣
    if (this.productData.price.current && this.productData.price.original) {
      const current = parseFloat(this.productData.price.current.replace(/[¥元]/g, ''));
      const original = parseFloat(this.productData.price.original.replace(/[¥元]/g, ''));
      if (current && original && current < original) {
        const discount = Math.round((current / original) * 10) / 10;
        this.productData.price.discount = discount.toFixed(1) + '折';
      }
    }
  }

  // 提取销量信息
  extractSales() {
    const salesSelectors = [
      '.tm-ind-sellCount .tm-count',
      '.tb-sellCount .tb-count', 
      '[class*="sell"] [class*="count"]',
      '[class*="sales"] [class*="count"]',
      '.sellCount',
      '.sales-count',
      '.sell-count'
    ];

    for (const selector of salesSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        this.productData.sales = element.textContent.trim();
        console.log('找到销量:', this.productData.sales);
        break;
      }
    }

    // 如果没找到，尝试模糊搜索包含销量关键词的文本
    if (!this.productData.sales) {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.children.length === 0 && el.textContent) {
          const text = el.textContent.trim();
          if (/已售|销量|月销/.test(text) && /\d+/.test(text)) {
            this.productData.sales = text;
            console.log('模糊搜索找到销量:', text);
            break;
          }
        }
      }
    }
  }

  // 滚动到页面底部并等待图片加载
  async scrollToBottomAndWaitForImages() {
    return new Promise((resolve) => {
      let scrollCount = 0;
      const maxScrolls = 2; // 最多滚动10次
      const scrollDelay = 500; // 每次滚动间隔500ms
      
      const scrollStep = () => {
        // 获取当前滚动位置和页面总高度
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        const totalHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        
        // 滚动到页面底部
        window.scrollTo({
          top: totalHeight,
          behavior: 'smooth'
        });
        
        scrollCount++;
        console.log(`滚动第${scrollCount}次，当前位置: ${currentScroll}, 总高度: ${totalHeight}`);
        
        // 检查是否已经到达底部或达到最大滚动次数
        if (currentScroll + viewportHeight >= totalHeight - 100 || scrollCount >= maxScrolls) {
          console.log('页面滚动完成，等待图片加载...');
          
          // 等待额外的时间让图片加载
          setTimeout(() => {
            // 滚动回到顶部，方便用户查看
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
            resolve();
          }, 2000); // 等待2秒让图片加载
          
        } else {
          // 继续滚动
          setTimeout(scrollStep, scrollDelay);
        }
      };
      
      // 开始滚动
      scrollStep();
    });
  }

  // 等待页面加载完成
  waitForContent() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
        return;
      }

      window.addEventListener('load', resolve);
      
      // 备用方案：等待一段时间
      setTimeout(resolve, 3000);
    });
  }

  // 提取所有数据
  async extractAll() {
    await this.waitForContent();
    
    // 滚动到页面底部，确保所有图片都加载完成
    console.log('开始滚动页面以加载所有资源...');
    await this.scrollToBottomAndWaitForImages();
    
    // 多次尝试提取，处理动态加载的内容
    for (let i = 0; i < 3; i++) {
      console.log(`第${i + 1}次数据提取...`);
      this.extractTitle();
      this.extractPrice();
      this.extractSales();
      this.extractMainImages();
      await this.extractDetailImages(); // 等待异步详情图提取完成
      
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return this.productData;
  }
}

// 创建全局提取器实例
window.taobaoExtractor = new TaobaoExtractor();

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    window.taobaoExtractor.extractAll().then(data => {
      sendResponse({ success: true, data: data });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // 表示异步响应
  }
});

