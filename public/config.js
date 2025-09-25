// 配置文件 - 管理错误类型映射和系统配置
const CONFIG = {
    // 版本信息
    VERSION: {
        major: 1,
        minor: 0,
        patch: 0,
        buildDate: '2025-07-13',
        full: '1.0.0',
        display: '1.0.0'
    },
    // 错误类型映射配置
    ERROR_TYPES: {
        'block_list': {
            name: '黑名单纠错',
            displayName: '黑名单纠错',
            description: '检测并纠正黑名单词汇',
            color: '#dc3545',
            priority: 1,
            fourthElementType: 'type_identifier' // 第4个元素是类型标识
        },
        'pol': {
            name: '政治术语纠错',
            displayName: '政治术语纠错',
            description: '政治术语相关纠错',
            color: '#fd7e14',
            priority: 1,
            fourthElementType: 'type_identifier' // 第4个元素是类型标识
        },
        'char': {
            name: '别字纠错',
            displayName: '别字纠错',
            description: '别字错误：单个字符的错误纠正（如错别字、笔误等）',
            color: '#dc3545',
            priority: 1,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'word': {
            name: '别词纠错',
            displayName: '别词纠错',
            description: '别词错误：词语使用错误的纠正',
            color: '#6f42c1',
            priority: 2,
            fourthElementType: 'type_identifier' // 第4个元素是类型标识
        },
        'redund': {
            name: '语法纠错-冗余',
            displayName: '冗余纠错',
            description: '冗余错误：删除文本中多余、重复的字符或词语',
            color: '#fd7e14',
            priority: 3,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'miss': {
            name: '语法纠错-缺失',
            displayName: '缺失纠错',
            description: '缺失错误：补充文本中遗漏的字符或词语',
            color: '#20c997',
            priority: 4,
            fourthElementType: 'description', // 第4个元素是详细描述
            hasEmptyCorrection: true // 可能有空的纠正结果
        },
        'order': {
            name: '语法纠错-语序',
            displayName: '语序纠错',
            description: '语序错误：调整词语或字符的排列顺序',
            color: '#17a2b8',
            priority: 5,
            fourthElementType: 'description', // 第4个元素是详细描述
            hasEmptyCorrection: true // 可能有空的纠正结果
        },
        'lx_word': {
            name: '词级别乱序纠错',
            displayName: '词级别乱序纠错',
            description: '词级乱序错误：词语在句子中的排列顺序不当',
            color: '#fd7e14',
            priority: 3,
            fourthElementType: 'type_identifier', // 第4个元素是类型标识
            hasEmptyCorrection: true // 纠错后可能为空
        },
        'lx_char': {
            name: '字级别乱序纠错',
            displayName: '字级别乱序纠错',
            description: '字级乱序错误：字符在词语中的排列顺序不当',
            color: '#e83e8c',
            priority: 3,
            fourthElementType: 'type_identifier', // 第4个元素是类型标识
            hasEmptyCorrection: true // 纠错后可能为空
        },
        'dapei': {
            name: '搭配纠错',
            displayName: '搭配纠错',
            description: '搭配错误：词语之间的搭配使用不当（如动宾搭配、形容词修饰等）',
            color: '#28a745',
            priority: 4,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'punc': {
            name: '标点纠错',
            displayName: '标点纠错',
            description: '标点错误：标点符号的使用、位置或类型错误（如逗号、句号、问号等）',
            color: '#6c757d',
            priority: 7,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'idm': {
            name: '成语纠错',
            displayName: '成语纠错',
            description: '成语纠错',
            color: '#007bff',
            priority: 8,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'org': {
            name: '机构名纠错',
            displayName: '机构名纠错',
            description: '机构名错误：公司、组织、机构等专有名称的错误',
            color: '#17a2b8',
            priority: 9,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'leader': {
            name: '领导人职称纠错',
            displayName: '领导人职称纠错',
            description: '领导人错误：政府官员、企业领导等重要人物姓名或职称的错误',
            color: '#495057',
            priority: 1,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'number': {
            name: '数字纠错',
            displayName: '数字纠错',
            description: '数字错误：数值、编号、统计数据、日期、时间等数字信息的错误',
            color: '#fd7e14',
            priority: 3,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'addr': {
            name: '地名纠错',
            displayName: '地名纠错',
            description: '地址错误：街道、城市、省份等地理位置信息的错误',
            color: '#20c997',
            priority: 3,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'name': {
            name: '全文人名纠错',
            displayName: '全文人名纠错',
            description: '人名错误：个人姓名的拼写或用字错误',
            color: '#e83e8c',
            priority: 2,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'grammar_pc': {
            name: '句式杂糅及重复',
            displayName: '句式杂糅及重复',
            description: '语法错误：句式杂糅和语义重复等语法结构问题',
            color: '#dc3545',
            priority: 1,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'date-d': {
            name: '日期纠错',
            displayName: '日期纠错',
            description: '日期错误：日期格式、时间表达等方面的错误',
            color: '#17a2b8',
            priority: 3,
            fourthElementType: 'description' // 第4个元素是详细描述
        },
        'black_list': {
            name: '黑名单纠错',
            displayName: '黑名单纠错',
            description: '敏感词错误：不当词汇、违规内容等的检测和处理',
            color: '#dc3545',
            priority: 1,
            fourthElementType: 'type_identifier' // 第4个元素是类型标识
        }
    },

    // UI配置
    UI: {
        MAX_TEXT_LENGTH: 2000,
        DEBOUNCE_DELAY: 300,
        MESSAGE_DISPLAY_TIME: 3000,
        CONFIDENCE_THRESHOLDS: {
            HIGH: 0.8,
            MEDIUM: 0.5
        },
        // 性能优化配置
        PERFORMANCE: {
            BATCH_SIZE: 100, // 批量处理大小
            DOM_UPDATE_THROTTLE: 16, // DOM更新节流时间(ms)
            CACHE_ENABLED: true, // 启用缓存
            CACHE_TTL: 300000 // 缓存生存时间(5分钟)
        }
    },

    // API配置
    API: {
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },

    // 数据格式检测配置
    DATA_FORMAT: {
        // 第4个元素为类型标识的错误类型
        TYPE_IDENTIFIER_TYPES: ['black_list', 'pol', 'block_list', 'word', 'lx_word', 'lx_char'],
        // 第4个元素为详细描述的错误类型
        DESCRIPTION_TYPES: ['char', 'redund', 'miss', 'order', 'dapei', 'punc', 'idm', 'org', 'leader', 'number', 'addr', 'name', 'grammar_pc', 'date-d'],
        // 可能有空纠正结果的错误类型
        EMPTY_CORRECTION_TYPES: ['miss', 'order', 'lx_word', 'lx_char', 'dapei', 'idm','punc', 'org', 'leader', 'number', 'addr', 'name', 'grammar_pc'],
        // 数据验证规则
        VALIDATION_RULES: {
            MIN_ARRAY_LENGTH: 3,
            MAX_ARRAY_LENGTH: 5,
            POSITION_MIN: 0,
            TEXT_MAX_LENGTH: 1000
        }
    },

    // 错误消息配置
    MESSAGES: {
        ERRORS: {
            EMPTY_TEXT: '请输入要纠错的文本',
            TEXT_TOO_LONG: '文本长度不能超过50字符',
            NETWORK_ERROR: '网络连接失败，请检查网络设置',
            API_ERROR: 'API调用失败，请稍后重试',
            FILE_TOO_LARGE: '文件大小不能超过10MB',
            UNSUPPORTED_FORMAT: '不支持的文件格式',
            PARSE_ERROR: '文件解析失败，请检查文件格式'
        },
        SUCCESS: {
            COPY_SUCCESS: '结果已复制到剪贴板',
            UPLOAD_SUCCESS: '文件上传成功',
            CORRECTION_COMPLETE: '文本纠错完成'
        },
        INFO: {
            NO_ERRORS: '未发现需要纠正的错误，文本质量良好！',
            TEXT_OPTIMIZED: '文本已进行优化处理',
            PROCESSING: '正在处理中，请稍候...'
        }
    }
};

// 导出配置对象
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}