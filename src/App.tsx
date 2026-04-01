import { useState, useRef, useEffect, MouseEvent, ChangeEvent } from 'react';
import { 
  ChevronLeft, 
  ChevronDown,
  Headphones, 
  Plus, 
  Mic, 
  Send, 
  X, 
  ChevronRight, 
  Check,
  Award,
  CircleDollarSign,
  Crown,
  Scale,
  Play,
  MessageSquare,
  Maximize,
  BookOpen,
  Copy,
  ShieldAlert,
  FileText,
  Upload,
  User,
  Trash2,
  Download,
  Info,
  Search,
  AlertTriangle,
  Loader2,
  AlertCircle,
  AlertOctagon,
  ClipboardCheck,
  FileEdit,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Calendar,
  Bell,
  Clock,
  Archive,
  Settings2,
  CheckSquare,
  Square,
  Volume2,
  RefreshCw,
  FileUp,
  ShieldCheck,
  Share2,
  UserPlus,
  Eye,
  UserCheck,
  Zap,
  Brain,
  Plane,
  Megaphone,
  Table,
  Lightbulb,
  Map,
  ExternalLink,
  Save,
  PenTool,
  ShoppingCart,
  Home,
  Utensils,
  Image as ImageIcon,
  Rocket,
  Globe,
  FileWarning,
  LayoutGrid,
  FlaskConical,
  Mic2,
  Wand2,
  DownloadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';
import { Message } from './types';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

const callGeminiWithRetry = async (params: any, maxRetries = 3, initialDelay = 1000) => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await genAI.models.generateContent(params);
    } catch (error: any) {
      lastError = error;
      const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
      const is429 = error?.message?.includes('429') || 
                    error?.status === 'RESOURCE_EXHAUSTED' ||
                    error?.code === 429 ||
                    errorStr.includes('429') ||
                    errorStr.includes('RESOURCE_EXHAUSTED') ||
                    (error?.error && (error.error.code === 429 || error.error.status === 'RESOURCE_EXHAUSTED'));
      
      const is503 = error?.message?.includes('503') || 
                    error?.status === 'UNAVAILABLE' ||
                    error?.code === 503 ||
                    errorStr.includes('503') ||
                    errorStr.includes('UNAVAILABLE') ||
                    (error?.error && (error.error.code === 503 || error.error.status === 'UNAVAILABLE'));

      const isTokenLimit = error?.message?.includes('max tokens limit') || 
                           errorStr.includes('max tokens limit') ||
                           error?.message?.includes('MAX_TOKENS') ||
                           errorStr.includes('MAX_TOKENS');

      if ((is429 || is503 || isTokenLimit) && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        let errorType = 'Unknown';
        if (is429) errorType = '429 Rate Limit';
        else if (is503) errorType = '503 Unavailable';
        else if (isTokenLimit) errorType = 'Token Limit';
        
        console.warn(`Gemini API error (${errorType}), retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        
        // If it's a token limit error, we might want to adjust the request if possible, 
        // but for now we'll just retry as it might be a transient model behavior or 
        // we can try to increase the limit in the next attempt if we had a way to modify params here.
        // Since we can't easily modify params here without more logic, we just retry.
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const QUESTION_LIBRARY = [
  {
    level: 1,
    name: '认知与价值层',
    questions: [
      '什么是电子合同？',
      '解决哪些痛点？',
      '哪些合同不能签？',
      '签署需要多久？',
      '个人/团队适用吗？',
      '客户不愿签怎么办？',
      '行业应用多吗？',
      '支持微信签署吗？'
    ]
  },
  {
    level: 2,
    name: '信任与合规层',
    questions: [
      '法律效力如何？',
      '如何提取证据？',
      '如何防范冒签？',
      '电子印章安全吗？',
      '机密会泄露吗？',
      '平台倒闭怎么办？',
      '合同能导出吗？',
      '离职员工乱签？'
    ]
  },
  {
    level: 3,
    name: '资费与门槛层',
    questions: [
      '如何收费？',
      '套餐贵吗？',
      '有隐形收费吗？',
      '签字方收费吗？',
      '支持系统对接吗？',
      '额度会过期吗？',
      '支持升级套餐吗？',
      '价格有优势吗？'
    ]
  },
  {
    level: 4,
    name: '行动与转化层',
    questions: [
      '如何申请试用？',
      '预约演示？',
      '查看成功案例？',
      '推荐有奖吗？',
      '分润模式靠谱吗？',
      '分润如何提现？',
      '支持对公转账吗？',
      '会员专属福利？'
    ]
  }
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'ai',
    content: '您好，我是点签专属智能顾问。我能为您解答电子合同、法律合规及会员权益相关问题，还能为您草拟合同模板。请问有什么可以帮您？',
    type: 'text',
    suggestions: [
      '什么是电子合同？',
      '解决哪些痛点？',
      '法律效力如何？',
      '如何收费？'
    ]
  }
];

const INDUSTRY_CASES = [
  { 
    title: '物流运输行业', 
    img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=450&fit=crop',
    company: '某知名城际货运平台',
    painPoint: '司机分布广，纸质合同签署慢、寄送贵、易丢失。',
    solution: '引入点签电子签名，实现司机手机端实时签署运输协议。',
    result: '合同签署周期从3天缩短至5分钟，法务成本降低60%。'
  },
  { 
    title: '医疗健康行业', 
    img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=450&fit=crop',
    company: '某连锁体检机构',
    painPoint: '知情同意书繁多，存档压力大，查询不便。',
    solution: '全流程数字化签署，自动分类归档，支持一键调取。',
    result: '签署效率提升80%，每年节省纸张及仓储费用20万+。'
  },
  { 
    title: '人力资源行业', 
    img: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=450&fit=crop',
    company: '某大型劳务派遣公司',
    painPoint: '入职高峰期合同量巨大，合规性风险高。',
    solution: '批量发起签署，AI 自动核验身份，确保本人签署。',
    result: '零纠纷、零冒签，HR 团队工作量减少70%。'
  },
  { 
    title: '金融保险行业', 
    img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=450&fit=crop',
    company: '某头部人寿保险公司',
    painPoint: '保单签署环节多，代签名风险大，理赔纠纷多。',
    solution: '强实名认证+意愿核验，确保每一份保单均由本人亲签。',
    result: '理赔纠纷率降低35%，保单生效时间从2天缩短至1小时。'
  },
  { 
    title: '房地产建筑行业', 
    img: 'https://images.unsplash.com/photo-1503387762-592dee58c460?w=800&h=450&fit=crop',
    company: '某地产龙头企业',
    painPoint: '供应链采购合同繁杂，异地供应商签署协同难。',
    solution: '集成ERP系统，实现采购合同自动化发起与智能归档。',
    result: '供应链协同效率提升50%，纸张及快递成本节省数百万。'
  },
  { 
    title: '教育培训行业', 
    img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=450&fit=crop',
    company: '某知名在线教育机构',
    painPoint: '学员退费纠纷频繁，纸质协议法律证据效力不足。',
    solution: '全流程存证+时间戳服务，确保服务协议不可篡改。',
    result: '法律维权成功率提升至100%，品牌信任度显著增强。'
  },
  { 
    title: '零售连锁行业', 
    img: 'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=800&h=450&fit=crop',
    company: '某全国连锁便利店',
    painPoint: '加盟商遍布全国，加盟合同签署周期长，管理难。',
    solution: '移动端远程签署，实时同步至总部后台，自动关联财务。',
    result: '加盟签约周期从15天缩短至1天，管理成本降低45%。'
  },
  { 
    title: '智能制造行业', 
    img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=450&fit=crop',
    company: '某高端装备制造厂',
    painPoint: '技术图纸保密协议多，纸质流转存在泄密风险。',
    solution: '电子合同加密存储，签署过程全链路审计，可追溯。',
    result: '核心技术资产安全性提升200%，签署合规性达标100%。'
  },
  { 
    title: '法律服务行业', 
    img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=450&fit=crop',
    company: '某知名律师事务所',
    painPoint: '法律服务协议签署频繁，律师异地办案签署不便。',
    solution: '点签APP随时随地发起签署，支持手写签名与印章。',
    result: '律师办案效率提升30%，客户满意度显著提高。'
  },
  { 
    title: '旅游票务行业', 
    img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=450&fit=crop',
    company: '某大型在线旅游平台',
    painPoint: '旅游合同签署量巨大，传统纸质合同存储成本极高。',
    solution: '电子合同云端存储，支持海量并发签署，秒级响应。',
    result: '每年节省仓储及快递费用500万+，签署成功率99.9%。'
  },
  { 
    title: '广告传媒行业', 
    img: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=450&fit=crop',
    company: '某知名广告传媒集团',
    painPoint: '广告发布合同多，排期变动频繁，补签工作量大。',
    solution: '移动端秒签，支持电子排期表自动关联，实时生效。',
    result: '排期确认时间从1天缩短至10分钟，业务流转效率翻倍。'
  },
  { 
    title: '外贸进出口行业', 
    img: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&h=450&fit=crop',
    company: '某大型外贸进出口公司',
    painPoint: '跨境签署周期长，快递成本高，印章管理风险大。',
    solution: '支持国际CA证书，符合国际法律标准，跨境秒级签署。',
    result: '单份合同节省快递费200元，签署周期从2周缩短至1天。'
  },
  { 
    title: '物业管理行业', 
    img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=450&fit=crop',
    company: '某品牌物业管理公司',
    painPoint: '业主分布广，物业服务协议、装修协议签署难。',
    solution: '微信小程序签署，支持人脸识别，确保业主本人签署。',
    result: '协议签署率提升至98%，物业费收缴率显著提高。'
  },
  { 
    title: 'IT互联网行业', 
    img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=450&fit=crop',
    company: '某独角兽互联网企业',
    painPoint: '员工入职、期权协议、保密协议签署频繁，管理压力大。',
    solution: '集成HR系统，实现员工全生命周期合同自动化管理。',
    result: 'HR 团队效率提升60%，合同合规性风险降低90%。'
  },
  { 
    title: '汽车租赁行业', 
    img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=450&fit=crop',
    company: '某全国连锁汽车租赁公司',
    painPoint: '租车合同签署频繁，车辆交接单据多，易丢失。',
    solution: '手机端现场签署，支持拍照存证，合同单据云端同步。',
    result: '车辆交接时间缩短50%，合同丢失率为零，纠纷处理更高效。'
  }
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [caseFilter, setCaseFilter] = useState('全部');
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [pitfallSearchQuery, setPitfallSearchQuery] = useState('');
  const [pitfallCategory, setPitfallCategory] = useState('全部');
  const [expandedPitfall, setExpandedPitfall] = useState<string | null>(null);
  const [previewContract, setPreviewContract] = useState<any>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [draftingFields, setDraftingFields] = useState<Record<string, string>>({});
  const [isDrafting, setIsDrafting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewAnalysis, setReviewAnalysis] = useState<any>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAssistantBubble, setShowAssistantBubble] = useState(true);
  const [assistantMood, setAssistantMood] = useState('happy');
  const [assistantText, setAssistantText] = useState(`您好，张先生！我是您的点签小助手“点点”，有什么可以帮您？`);
  const [assistantAnimation, setAssistantAnimation] = useState('float');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; data: string } | null>(null);

  const [managedContracts, setManagedContracts] = useState([
    { 
      id: 'c1', 
      title: '2024年度物流运输服务协议', 
      partyA: '点签科技有限公司', 
      partyB: '顺丰速运', 
      expiryDate: '2024-12-31', 
      status: 'active',
      reminders: [7, 30],
      category: '运输服务',
      clauses: [
        '第一条：服务内容及范围 - 涵盖全国范围内的干线运输与同城配送。',
        '第二条：服务费用及支付方式 - 按月结算，次月15日前支付上月费用。',
        '第三条：双方权利与义务 - 乙方需确保货物安全，甲方需按时支付费用。',
        '第四条：违约责任 - 延迟交付按运费的5%/天扣除。',
        '第五条：争议解决 - 提交至上海仲裁委员会。'
      ],
      reminderSettings: {
        advanceDays: [7, 30],
        method: '短信+邮件',
        status: '已开启'
      }
    },
    { 
      id: 'c2', 
      title: '核心技术开发外包合同', 
      partyA: '点签科技有限公司', 
      partyB: '某某软件工作室', 
      expiryDate: '2024-04-15', 
      status: 'expiring',
      reminders: [3, 7, 15],
      category: '技术开发',
      clauses: [
        '第一条：开发任务说明 - 包含移动端APP及后台管理系统开发。',
        '第二条：交付节点与验收 - 分三期交付，每期验收合格后支付相应款项。',
        '第三条：知识产权归属 - 所有源代码及相关文档知识产权归甲方所有。',
        '第四条：保密条款 - 乙方需对项目相关技术细节严格保密。',
        '第五条：违约责任 - 逾期交付超过15天，甲方有权解除合同。'
      ],
      reminderSettings: {
        advanceDays: [3, 7, 15],
        method: '系统推送+邮件',
        status: '已开启'
      }
    },
    { 
      id: 'c3', 
      title: '办公室租赁合同 - 2023', 
      partyA: '物业管理公司', 
      partyB: '点签科技有限公司', 
      expiryDate: '2023-10-01', 
      status: 'expired',
      reminders: [],
      category: '房屋租赁',
      clauses: [
        '第一条：租赁房屋概况 - 位于上海市浦东新区某某大厦10楼。',
        '第二条：租赁期限 - 自2022年10月1日至2023年10月1日。',
        '第三条：租金及押金 - 租金为10万元/月，押三付一。',
        '第四条：房屋维护 - 承租方需保持房屋结构完整。',
        '第五条：续租条款 - 需提前3个月书面通知出租方。'
      ],
      reminderSettings: {
        advanceDays: [],
        method: '无',
        status: '已关闭'
      }
    },
    { 
      id: 'c4', 
      title: '云服务器订阅服务协议', 
      partyA: '阿里云计算有限公司', 
      partyB: '点签科技有限公司', 
      expiryDate: '2024-08-20', 
      status: 'active',
      reminders: [7],
      category: 'IT服务'
    },
    { 
      id: 'c5', 
      title: '市场推广合作框架协议', 
      partyA: '点签科技有限公司', 
      partyB: '字节跳动巨量引擎', 
      expiryDate: '2024-05-12', 
      status: 'active',
      reminders: [15, 30],
      category: '市场营销'
    },
    { 
      id: 'c6', 
      title: '员工期权授予协议 - 张三', 
      partyA: '点签科技有限公司', 
      partyB: '张三', 
      expiryDate: '2028-01-01', 
      status: 'active',
      reminders: [30],
      category: '股权激励'
    },
    { 
      id: 'c7', 
      title: '年度法律顾问服务合同', 
      partyA: '某某律师事务所', 
      partyB: '点签科技有限公司', 
      expiryDate: '2024-03-31', 
      status: 'expiring',
      reminders: [1, 3, 7],
      category: '法律服务'
    },
    { 
      id: 'c8', 
      title: '办公用品采购年度协议', 
      partyA: '晨光文具股份有限公司', 
      partyB: '点签科技有限公司', 
      expiryDate: '2024-06-30', 
      status: 'active',
      reminders: [7],
      category: '行政采购'
    },
    { 
      id: 'c9', 
      title: '2024年度保洁服务外包协议', 
      partyA: '点签科技有限公司', 
      partyB: '某某家政服务公司', 
      expiryDate: '2024-12-31', 
      status: 'active',
      reminders: [30],
      category: '行政服务'
    },
    { 
      id: 'c10', 
      title: '核心骨干员工保密协议 - 李四', 
      partyA: '点签科技有限公司', 
      partyB: '李四', 
      expiryDate: '2029-01-01', 
      status: 'active',
      reminders: [30],
      category: '知识产权'
    },
    { 
      id: 'c11', 
      title: '办公场地宽带接入服务合同', 
      partyA: '中国电信股份有限公司', 
      partyB: '点签科技有限公司', 
      expiryDate: '2024-02-28', 
      status: 'expired',
      reminders: [],
      category: 'IT服务'
    },
    { 
      id: 'c12', 
      title: '2024年度团建活动策划协议', 
      partyA: '点签科技有限公司', 
      partyB: '某某团建策划公司', 
      expiryDate: '2024-05-30', 
      status: 'active',
      reminders: [7, 15],
      category: '行政活动'
    },
    { 
      id: 'c13', 
      title: '公司法律顾问服务协议 - 续签', 
      partyA: '某某律师事务所', 
      partyB: '点签科技有限公司', 
      expiryDate: '2025-03-31', 
      status: 'active',
      reminders: [30],
      category: '法律服务'
    }
  ]);

  const [selectedContractIds, setSelectedContractIds] = useState<string[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [aiInsight, setAiInsight] = useState<{ content: string; date: string } | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const industryPitfalls = [
    {
      id: 'hr',
      industry: '劳动人事',
      category: '服务业',
      icon: <UserCheck className="w-4 h-4" />,
      color: 'bg-blue-500',
      riskLevel: '高',
      pitfall: '入职未签合同、试用期不交社保、加班费约定不明。',
      tip: 'AI 建议：入职30日内必须签署书面合同，试用期包含在合同期内，必须缴纳社保。',
      legalBasis: '《劳动合同法》第十条：建立劳动关系，应当订立书面劳动合同。已建立劳动关系，未同时订立书面劳动合同的，应当自用工之日起一个月内订立书面劳动合同。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334561.html',
      action: '生成标准劳动合同'
    },
    {
      id: 'ecommerce',
      industry: '电子商务',
      category: '服务业',
      icon: <ShoppingCart className="w-4 h-4" />,
      color: 'bg-orange-500',
      riskLevel: '高',
      pitfall: '退换货条款违反消法、虚假宣传、个人信息保护不力。',
      tip: 'AI 建议：明确“七天无理由退货”范围，严禁使用“最终解释权”等霸王条款。',
      legalBasis: '《消费者权益保护法》第二十五条：经营者采用网络、电视、电话、邮购等方式销售商品，消费者有权自收到商品之日起七日内退货，且无需说明理由。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334562.html',
      action: '审查店铺协议'
    },
    {
      id: 'realestate',
      industry: '房地产',
      category: '资产类',
      icon: <Home className="w-4 h-4" />,
      color: 'bg-emerald-500',
      riskLevel: '高',
      pitfall: '定金与订金混淆、违约金比例过高、交房标准模糊。',
      tip: 'AI 建议：区分“定金”的担保性质，违约金通常不超过总价的20%-30%。',
      legalBasis: '《民法典》第五百八十六条：当事人可以约定一方向对方给付定金作为债权的担保。定金的数额由当事人约定；但是，不得超过主合同标的额的百分之二十。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334563.html',
      action: '分析购房合同'
    },
    {
      id: 'finance',
      industry: '金融借贷',
      category: '金融类',
      icon: <CircleDollarSign className="w-4 h-4" />,
      color: 'bg-red-500',
      riskLevel: '极高',
      pitfall: '高利贷陷阱、砍头息、担保责任范围不明确。',
      tip: 'AI 建议：年利率超过LPR四倍的部分不受法律保护，务必核实实际到账金额。',
      legalBasis: '《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第二十五条：出借人请求借款人按照合同约定利率支付利息的，人民法院应予支持，但是双方约定的利率超过合同成立时一年期贷款市场报价利率四倍的除外。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334564.html',
      action: '借款风险评估'
    },
    {
      id: 'ip',
      industry: '知识产权',
      category: '技术类',
      icon: <ShieldCheck className="w-4 h-4" />,
      color: 'bg-purple-500',
      riskLevel: '中',
      pitfall: '著作权归属不明、商标抢注、商业秘密泄露。',
      tip: 'AI 建议：在合同中明确职务作品的归属，签署保密协议（NDA）并约定竞业限制。',
      legalBasis: '《著作权法》第十六条：公民为完成法人或者其他组织工作任务所创作的作品是职务作品，除本条第二款的规定外，著作权由作者享有。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334565.html',
      action: '起草保密协议'
    },
    {
      id: 'service',
      industry: '餐饮服务',
      category: '服务业',
      icon: <Utensils className="w-4 h-4" />,
      color: 'bg-amber-500',
      riskLevel: '中',
      pitfall: '食品安全责任划分、加盟合同陷阱、预付款退款难。',
      tip: 'AI 建议：明确供应商质量责任，加盟合同需核实特许经营备案资质。',
      legalBasis: '《食品安全法》第一百四十八条：消费者因不符合食品安全标准的食品受到损害的，可以向经营者要求赔偿损失，也可以向生产者要求赔偿损失。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334566.html',
      action: '餐饮加盟咨询'
    },
    {
      id: 'logistics',
      industry: '物流运输',
      category: '服务业',
      icon: <Zap className="w-4 h-4" />,
      color: 'bg-sky-500',
      riskLevel: '中',
      pitfall: '货物损失赔偿标准不一、保险覆盖不足、结算周期过长。',
      tip: 'AI 建议：明确“限额赔偿”条款，强制要求购买货运险，约定逾期付款利息。',
      legalBasis: '《邮政法》第四十七条：邮政企业对给据邮件的损失依照下列规定赔偿：未保价的给据邮件丢失、损毁或者内件短少的，按照实际损失赔偿，但最高赔偿额不超过所收取资费的三倍。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334567.html',
      action: '优化运输协议'
    },
    {
      id: 'education',
      industry: '教育培训',
      category: '服务业',
      icon: <BookOpen className="w-4 h-4" />,
      color: 'bg-indigo-500',
      riskLevel: '高',
      pitfall: '退费规则不合规、教师竞业限制过严、课程质量承诺模糊。',
      tip: 'AI 建议：遵循“双减”政策退费要求，明确线上线下服务切换机制。',
      legalBasis: '《关于规范校外培训机构发展的意见》：校外培训机构收费时段与教学安排应协调一致，不得一次性收取时间跨度超过3个月的费用。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334568.html',
      action: '起草培训合同'
    },
    {
      id: 'manufacturing',
      industry: '智能制造',
      category: '制造类',
      icon: <Settings2 className="w-4 h-4" />,
      color: 'bg-slate-600',
      riskLevel: '中',
      pitfall: '技术图纸泄密、验收标准不统一、延期交货责任不明。',
      tip: 'AI 建议：细化分阶段验收流程，增加知识产权归属条款，明确不可抗力范围。',
      legalBasis: '《民法典》第七百七十条：承揽合同是承揽人按照定作人的要求完成工作，交付工作成果，定作人支付报酬的合同。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334569.html',
      action: '定制采购合同'
    },
    {
      id: 'medical',
      industry: '医疗健康',
      category: '服务业',
      icon: <ShieldAlert className="w-4 h-4" />,
      color: 'bg-rose-500',
      riskLevel: '高',
      pitfall: '患者隐私泄露、医疗器械合规性风险、知情同意书不全。',
      tip: 'AI 建议：严格执行数据脱敏处理，核实二三类医疗器械经营许可。',
      legalBasis: '《基本医疗卫生与健康促进法》第九十二条：国家保护公民个人健康信息。医疗卫生机构、医疗卫生人员应当依照法律、行政法规和国家有关规定，采取措施，防止公民个人健康信息泄露、篡改、丢失。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334570.html',
      action: '医疗合规咨询'
    },
    {
      id: 'energy',
      industry: '能源环保',
      category: '制造类',
      icon: <Zap className="w-4 h-4" />,
      color: 'bg-green-600',
      riskLevel: '中',
      pitfall: '环评手续不全、碳排放指标交易纠纷、设备租赁违约。',
      tip: 'AI 建议：核实环评批复文件，明确碳排放配额归属，约定设备故障停机补偿。',
      legalBasis: '《环境影响评价法》第二十五条：建设项目的环境影响评价文件未经法律规定的审批部门审查或者审查后未予批准的，该项目审批部门不得批准其建设，建设单位不得开工建设。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334571.html',
      action: '审查环保协议'
    },
    {
      id: 'tourism',
      industry: '旅游出行',
      category: '服务业',
      icon: <Plane className="w-4 h-4" />,
      color: 'bg-cyan-500',
      riskLevel: '高',
      pitfall: '强制消费、不可抗力退费争议、人身意外责任划分。',
      tip: 'AI 建议：严禁“零负团费”，明确自然灾害等不可抗力下的费用分摊机制。',
      legalBasis: '《旅游法》第三十五条：旅行社不得以不合理的低价组织旅游活动，诱骗旅游者，并通过安排购物或者另行付费旅游项目获取回扣等不正当利益。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334572.html',
      action: '分析旅游合同'
    },
    {
      id: 'advertising',
      industry: '广告营销',
      category: '服务业',
      icon: <Megaphone className="w-4 h-4" />,
      color: 'bg-pink-500',
      riskLevel: '中',
      pitfall: '违反《广告法》禁用词、流量造假、版权图片侵权。',
      tip: 'AI 建议：建立广告词AI预审机制，约定KPI考核标准及第三方监测数据效力。',
      legalBasis: '《广告法》第九条：广告不得有下列情形：（三）使用“国家级”、“最高级”、“最佳”等用语。',
      caseLink: 'https://www.court.gov.cn/zixun-xiangqing-334573.html',
      action: '起草营销合同'
    }
  ];

  const [activeInsightTab, setActiveInsightTab] = useState<'news' | 'tutorial' | 'tools' | 'video' | 'scenarios' | 'lab'>('news');
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(null);
  const [coverPrompt, setCoverPrompt] = useState('');
  const [aiScenarios] = useState([
    { 
      id: 's1', 
      title: '初创企业合规包', 
      desc: '从公司注册到首份劳动合同，全套 AI 辅助方案。', 
      icon: 'Rocket',
      color: 'bg-orange-500',
      tag: '热门',
      steps: [
        { type: 'prompt', text: '使用指令：初创合规深度扫描' },
        { type: 'template', text: '下载模板：股东协议/合伙协议' },
        { type: 'tool', text: '工具推荐：Kimi (分析政策文件)' }
      ],
      action: '我想了解初创企业全套合规方案'
    },
    { 
      id: 's2', 
      title: '劳动纠纷维权指南', 
      desc: '遇到不公正对待？AI 帮你收集证据并起草申请。', 
      icon: 'Scale',
      color: 'bg-blue-500',
      tag: '实用',
      steps: [
        { type: 'prompt', text: '使用指令：劳动纠纷证据清单' },
        { type: 'video', text: '视频学习：3分钟学会写仲裁申请' },
        { type: 'tool', text: '工具推荐：DeepSeek (法律逻辑分析)' }
      ],
      action: '我遇到了劳动纠纷，请帮我制定维权方案'
    },
    { 
      id: 's3', 
      title: '知识产权出海', 
      desc: '品牌出海第一步，AI 助力全球商标与版权保护。', 
      icon: 'Globe',
      color: 'bg-emerald-500',
      tag: '专业',
      steps: [
        { type: 'prompt', text: '使用指令：国际版权登记咨询' },
        { type: 'tool', text: '工具推荐：Claude (专业法律翻译)' },
        { type: 'template', text: '下载模板：国际授权许可协议' }
      ],
      action: '我想了解知识产权出海的法律保护方案'
    },
    { 
      id: 's4', 
      title: '合同违约追偿', 
      desc: '对方不履行合同？AI 帮你评估胜诉率并起草催款函。', 
      icon: 'FileWarning',
      color: 'bg-red-500',
      tag: '高效',
      steps: [
        { type: 'prompt', text: '使用指令：违约损失测算' },
        { type: 'prompt', text: '使用指令：律师函/催款函起草' },
        { type: 'tool', text: '工具推荐：通义千问 (文案润色)' }
      ],
      action: '对方合同违约了，请帮我制定追偿方案'
    }
  ]);
  const [aiTutorials] = useState([
    { id: 'tut1', title: '如何写好 Prompt？', content: '遵循“角色+背景+任务+要求”公式。例如：你是一位资深律师，请帮我审查这份劳动合同，重点关注竞业协议条款，并给出修改建议。', icon: 'Lightbulb' },
    { id: 'tut2', title: 'AI 辅助合同审查技巧', content: '先让 AI 总结合同要点，再针对性询问：该合同对甲方有哪些潜在风险？是否有违反《劳动合同法》的条款？', icon: 'ShieldCheck' },
    { id: 'tut3', title: '提升 AI 响应质量', content: '给 AI 示例（Few-shot）。如果你想要特定格式的输出，先给它一个正确的例子，AI 的表现会大幅提升。', icon: 'Zap' },
    { id: 'tut4', title: '让 AI 逐步思考', content: '在指令末尾加上“请一步步思考”。这能显著提高 AI 在处理复杂法律逻辑或计算赔偿金时的准确性。', icon: 'Brain' },
    { id: 'tut5', title: '结构化输出技巧', content: '要求 AI 以表格或 JSON 格式输出。例如：“请将这份合同的争议解决条款总结为表格，包含：管辖法院、适用法律、仲裁机构。”', icon: 'Table' },
    { id: 'tut6', title: '法律文书起草指南', content: '提供关键要素而非全文。例如：“请帮我起草一份解除劳动合同协议书，员工姓名张三，解除原因是协商一致，补偿金为 N+1。”', icon: 'FileEdit' },
    { id: 'tut7', title: '长文档分析秘籍', content: '分段处理。对于超长合同，可以先让 AI 提取目录，再针对特定章节进行深度分析，避免遗漏细节。', icon: 'Search' },
    { id: 'tut8', title: '语气与风格控制', content: '明确沟通对象。例如：“请将这段法律术语改写成通俗易懂的文字，发给没有法律背景的客户看。”', icon: 'MessageSquare' }
  ]);
  const [aiTools] = useState([
    { id: 'tool4', name: 'Kimi 智能助手', category: '长文本/分析', desc: '国产之光，支持 200 万字长文本分析，法律人深度阅读必备。', link: 'https://kimi.moonshot.cn' },
    { id: 'tool6', name: 'DeepSeek', category: '推理/代码', desc: '国产最强开源模型，极高性价比，逻辑推理与编程能力惊人。', link: 'https://www.deepseek.com' },
    { id: 'tool7', name: '通义千问 (Qwen)', category: '全能型', desc: '阿里巴巴出品，具备强大的中英文理解能力，办公辅助全能手。', link: 'https://tongyi.aliyun.com' },
    { id: 'tool8', name: '智谱清言', category: '对话/创作', desc: '清华系背景，中英双语能力出色，擅长长文档处理与智能体构建。', link: 'https://chatglm.cn' },
    { id: 'tool9', name: '文心一言 (ERNIE)', category: '知识/对话', desc: '百度出品，拥有深厚的中文知识库，适合日常咨询与文案创作。', link: 'https://yiyan.baidu.com' },
    { id: 'tool10', name: '豆包 (Doubao)', category: '生活/效率', desc: '字节跳动出品，响应极快，支持多模态交互，手机端体验极佳。', link: 'https://www.doubao.com' },
    { id: 'tool11', name: '讯飞星火', category: '语音/办公', desc: '科大讯飞出品，语音识别与处理能力顶尖，适合会议纪要与翻译。', link: 'https://xinghuo.xfyun.cn' },
    { id: 'tool1', name: 'Claude 3.5', category: '文本/逻辑', desc: '目前逻辑推理和代码能力最强的模型之一，适合深度分析。', link: 'https://claude.ai' },
    { id: 'tool2', name: 'Midjourney', category: '绘图', desc: '艺术创作与商业设计首选，画质精美，风格多样。', link: 'https://midjourney.com' },
    { id: 'tool3', name: 'Perplexity', category: '搜索', desc: 'AI 搜索领域的领头羊，实时抓取网页并提供引用来源。', link: 'https://perplexity.ai' },
    { id: 'tool5', name: 'Gamma', category: 'PPT/展示', desc: '输入一句话即可生成精美的 PPT 和网页。', link: 'https://gamma.app' }
  ]);
  const [aiVideos] = useState([
    { 
      id: 'v1', 
      title: '3分钟学会做一张海报', 
      duration: '03:15', 
      desc: '利用 AI 工具快速生成精美海报，零基础也能上手。', 
      thumbnail: 'https://picsum.photos/seed/poster/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '打开 AI 设计工具（如 Canva 或稿定设计）',
        '在搜索框输入“海报”并选择一个喜欢的模板',
        '使用 AI 辅助功能一键替换背景和文字',
        '调整布局，加入个人元素，点击导出即可'
      ],
      tip: '提示：选择模板时，尽量挑选构图简洁的，AI 替换后的效果会更自然。'
    },
    { 
      id: 'v2', 
      title: 'AI 辅助合同审查实战', 
      duration: '04:20', 
      desc: '手把手教你如何用 AI 快速识别合同中的法律风险。', 
      thumbnail: 'https://picsum.photos/seed/legal/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '将合同文档上传至 AI 助手（如 Kimi 或 ChatGPT）',
        '输入指令：“请帮我审查这份合同，重点找出对乙方不利的条款”',
        '查看 AI 生成的风险点列表 and 修改建议',
        '根据 AI 提示，逐条核对并完善合同内容'
      ],
      tip: '提示：AI 的建议仅供参考，涉及重大法律责任时，请务必咨询专业律师。'
    },
    { 
      id: 'v3', 
      title: '一键生成 PPT 秘籍', 
      duration: '02:50', 
      desc: '告别熬夜，教你用 AI 在几分钟内完成高质量演示文稿。', 
      thumbnail: 'https://picsum.photos/seed/ppt/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '在 Gamma 或 Tome 中输入你的 PPT 主题',
        'AI 会自动生成大纲，你可以根据需要进行微调',
        '选择一种设计风格，AI 将自动填充内容和配图',
        '最后进行细节优化，导出为 PPT 或 PDF'
      ],
      tip: '提示：在大纲阶段多花点时间微调，生成的 PPT 内容会更贴合你的需求。'
    },
    { 
      id: 'v4', 
      title: '5分钟搞定周报总结', 
      duration: '05:00', 
      desc: '输入碎片化信息，AI 帮你自动生成结构化、专业化的周报。', 
      thumbnail: 'https://picsum.photos/seed/report/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '记录下本周完成的关键工作点（哪怕是碎碎念）',
        '将这些点喂给 AI，并要求其按“工作内容、成果、下周计划”排版',
        '让 AI 润色语言，使其更具职场专业感',
        '检查数据准确性，一键复制到邮件或钉钉'
      ],
      tip: '提示：可以告诉 AI 你的职位，它会生成更符合你职业身份的专业词汇。'
    },
    { 
      id: 'v5', 
      title: 'AI 翻译：跨国会议不求人', 
      duration: '03:45', 
      desc: '实时同声传译与文档翻译技巧，轻松应对多语言办公环境。', 
      thumbnail: 'https://picsum.photos/seed/translate/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '开启 AI 同传工具（如腾讯同传或飞书妙记）',
        '设置目标语言，AI 将实时生成双语字幕',
        '会议结束后，利用 AI 快速总结会议纪要',
        '对于专业文档，使用 AI 翻译并保持原排版不变'
      ],
      tip: '提示：在嘈杂环境下，建议佩戴耳机或使用外接麦克风，以提高 AI 识别准确率。'
    },
    { 
      id: 'v6', 
      title: '零基础制作 AI 形象照', 
      duration: '04:10', 
      desc: '无需影楼，教你用 AI 生成专业、大气的职场形象照片。', 
      thumbnail: 'https://picsum.photos/seed/portrait/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '准备 5-10 张自己的清晰生活照',
        '上传至 AI 形象照生成工具（如妙鸭相机或类似插件）',
        '选择“职场商务”风格模板',
        '等待 AI 训练并生成，挑选最满意的一张下载'
      ],
      tip: '提示：上传的照片背景越简单、光线越均匀，生成的形象照效果越逼真。'
    },
    { 
      id: 'v7', 
      title: '智能表格：数据清洗秒完成', 
      duration: '02:30', 
      desc: '利用 AI 快速处理杂乱数据，提取关键信息并生成可视化图表。', 
      thumbnail: 'https://picsum.photos/seed/data/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '将杂乱的 Excel 数据上传至 AI 数据分析助手',
        '输入指令：“请帮我清洗这些数据，统一日期格式并去除重复项”',
        '要求 AI 生成关键指标的柱状图或饼图',
        '直接下载处理后的表格和图表图片'
      ],
      tip: '提示：对于超大数据集，建议先在本地进行简单筛选，再交给 AI 处理。'
    },
    { 
      id: 'v8', 
      title: '法律条文通俗化解读', 
      duration: '03:55', 
      desc: '让 AI 帮你把晦涩难懂的法律条文翻译成“人话”，降低理解门槛。', 
      thumbnail: 'https://picsum.photos/seed/law/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '复制一段复杂的法律条文或判决书内容',
        '对 AI 说：“请用 10 岁小孩能听懂的话解释这段话的意思”',
        '让 AI 列出该条文对普通人的实际影响',
        '针对具体场景询问 AI：“如果我遇到这种情况该怎么办？”'
      ],
      tip: '提示：如果 AI 解释得还不够清楚，可以要求它“举一个生活中的例子”。'
    },
    { 
      id: 'v9', 
      title: 'AI 辅助写邮件：得体又专业', 
      duration: '02:45', 
      desc: '无论是请假、求职还是商务洽谈，AI 都能帮你写出最得体的邮件。', 
      thumbnail: 'https://picsum.photos/seed/email/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '在 AI 助手输入邮件主题和核心诉求',
        '指定邮件的语气（如：正式、委婉、热情）',
        '让 AI 生成 2-3 个不同版本的草稿供你选择',
        '微调细节，一键复制发送'
      ],
      tip: '提示：在邮件末尾加上“请帮我检查是否有语法错误或不礼貌的用词”，效果更佳。'
    },
    { 
      id: 'v10', 
      title: '用 AI 快速总结超长视频', 
      duration: '04:30', 
      desc: '没时间看长视频？教你用 AI 工具在几秒钟内提取视频精华。', 
      thumbnail: 'https://picsum.photos/seed/videosum/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '复制视频链接（如 B站、YouTube 或本地文件）',
        '使用 AI 视频总结工具（如 BiliGPT 或飞书妙记）',
        '查看 AI 自动生成的思维导图或核心观点列表',
        '点击感兴趣的时间戳，直接跳转到视频对应位置查看详情'
      ],
      tip: '提示：对于外语视频，AI 总结功能还能帮你跨越语言障碍，快速理解核心内容。'
    },
    { 
      id: 'v11', 
      title: 'AI 辅助编程：小白也能写代码', 
      duration: '06:00', 
      desc: '教你如何用 AI 编写简单的自动化脚本或网页小工具。', 
      thumbnail: 'https://picsum.photos/seed/code/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '在 Cursor 或 VS Code 中安装 AI 插件',
        '用自然语言描述你想要的功能（如：帮我写一个倒计时网页）',
        '查看 AI 生成的代码，并根据提示进行调试',
        '点击运行，见证你的第一个 AI 辅助程序诞生'
      ],
      tip: '提示：不要害怕报错，把报错信息直接丢给 AI，它会告诉你如何修复。'
    },
    { 
      id: 'v12', 
      title: 'AI 简历优化：斩获心仪 Offer', 
      duration: '04:45', 
      desc: '教你如何利用 AI 深度挖掘个人亮点，打造一份极具竞争力的简历。', 
      thumbnail: 'https://picsum.photos/seed/resume/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '将你的原始简历和目标岗位描述（JD）发给 AI',
        '要求 AI 针对 JD 关键词优化你的项目经历',
        '让 AI 帮你润色自我评价，使其更具吸引力',
        '最后让 AI 检查简历的排版和错别字'
      ],
      tip: '提示：一定要提供具体的项目细节，AI 才能帮你写出有说服力的成果描述。'
    },
    { 
      id: 'v13', 
      title: '短视频脚本：一键生成爆款', 
      duration: '03:30', 
      desc: '输入一个创意点，AI 帮你自动生成分镜头脚本和拍摄建议。', 
      thumbnail: 'https://picsum.photos/seed/script/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '在 AI 助手输入你的视频主题或核心创意',
        '指定视频平台（如抖音、小红书）和目标受众',
        '让 AI 生成包含“黄金 3 秒、冲突点、反转、结尾”的脚本',
        '参考 AI 给出的拍摄角度和背景音乐建议进行拍摄'
      ],
      tip: '提示：可以要求 AI 给脚本增加一些“情绪价值”，更容易引起观众共鸣。'
    },
    { 
      id: 'v14', 
      title: 'AI 会议纪要：解放双手', 
      duration: '02:55', 
      desc: '教你如何用 AI 快速整理会议录音，提取待办事项和核心结论。', 
      thumbnail: 'https://picsum.photos/seed/meeting/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '使用飞书妙记或类似工具录制会议并转写文字',
        '将转写后的全文复制给 AI 助手',
        '输入指令：“请帮我总结本次会议的核心结论和每个人的待办事项”',
        '将 AI 生成的摘要一键同步到团队协作文档'
      ],
      tip: '提示：在会议中明确提到“待办事项”等关键词，AI 提取时会更准确。'
    },
    { 
      id: 'v15', 
      title: '法律文书翻译：精准又专业', 
      duration: '05:20', 
      desc: '利用 AI 深度理解法律语境，完成高质量的中外法律文书互译。', 
      thumbnail: 'https://picsum.photos/seed/lawtrans/200/120',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      steps: [
        '上传需要翻译的法律文书（如合同、判决书）',
        '告知 AI 目标语言和适用的法律体系（如英美法系）',
        '要求 AI 重点关注专业术语的准确性',
        '对翻译后的内容进行法律逻辑核对'
      ],
      tip: '提示：可以要求 AI 列出翻译中使用的关键法律术语及其解释，方便核对。'
    }
  ]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [userPoints, setUserPoints] = useState(120);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [recentSignups, setRecentSignups] = useState([
    "张** 刚刚开通了终身会员",
    "李* 领取了50元抵扣券",
    "王** 成功邀请了3位好友",
    "赵* 兑换了10份合同额度",
    "陈** 刚刚完成了合同审查"
  ]);
  const [signupIndex, setSignupIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSignupIndex(prev => (prev + 1) % recentSignups.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [recentSignups.length]);

  const [tasks, setTasks] = useState([
    { id: 't1', title: '每日签到', points: 5, icon: 'Calendar', completed: false, description: '每日登录即可领取', category: 'daily' },
    { id: 't5', title: '阅读 AI 行业资讯', points: 2, icon: 'Sparkles', completed: false, description: '了解 AI 赋能最新动态', category: 'daily' },
    { id: 't6', title: '观看视频教程', points: 15, icon: 'Play', completed: false, description: '快速上手点签平台', category: 'daily' },
    { id: 't2', title: '分享至朋友圈', points: 20, icon: 'Share2', completed: false, description: '提升平台曝光量', category: 'grow' },
    { id: 't3', title: '邀请好友注册', points: 50, icon: 'UserPlus', completed: false, description: '每邀请一位奖励50积分', category: 'grow' },
    { id: 't4', title: '完善个人信息', points: 10, icon: 'UserCheck', completed: true, description: '让点点更懂您的需求', category: 'basic' },
    { id: 't7', title: '实名认证', points: 100, icon: 'ShieldCheck', completed: false, description: '保障合同法律效力', category: 'basic' },
    { id: 't8', title: '上传首份合同', points: 30, icon: 'FileUp', completed: false, description: '开启数字化签署之旅', category: 'basic' },
  ]);

  const refreshTasks = () => {
    setIsInsightLoading(true);
    setTimeout(() => {
      setTasks(prev => prev.map(t => t.category === 'daily' ? { ...t, completed: false } : t));
      setIsInsightLoading(false);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#FF6B00']
      });
    }, 800);
  };

  const completeTask = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && !t.completed) {
        setUserPoints(pts => pts + t.points);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF6B00', '#007AFF', '#FFD700']
        });
        return { ...t, completed: true };
      }
      return t;
    }));
  };

  const redeemPoints = (cost: number, benefit: string) => {
    if (userPoints >= cost) {
      setUserPoints(prev => prev - cost);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#007AFF', '#FFD700']
      });
      alert(`兑换成功！已获得：${benefit}`);
    } else {
      alert('积分不足，快去完成任务赚取积分吧！');
    }
  };

  const speak = (text: string, msgId: string) => {
    if (isSpeaking === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.1;
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);
    
    setIsSpeaking(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const toggleReminder = (contractId: string, day: number) => {
    setManagedContracts(prev => prev.map(c => {
      if (c.id === contractId) {
        const newReminders = c.reminders.includes(day)
          ? c.reminders.filter(d => d !== day)
          : [...c.reminders, day].sort((a, b) => a - b);
        return { ...c, reminders: newReminders };
      }
      return c;
    }));
  };

  const batchArchive = () => {
    setManagedContracts(prev => prev.map(c => 
      selectedContractIds.includes(c.id) ? { ...c, status: 'archived' } : c
    ));
    setSelectedContractIds([]);
    setIsBatchMode(false);
  };

  const batchSend = () => {
    if (selectedContractIds.length === 0) return;
    
    // Simulate batch sending
    const count = selectedContractIds.length;
    
    // Show a success message in chat
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'ai',
      content: `🚀 已为您批量发送 ${count} 份合同。系统已自动生成签署链接并发送至对方邮箱/手机。您可以随时在“合同状态”中追踪进度。`,
      type: 'text'
    }]);
    
    setSelectedContractIds([]);
    setIsBatchMode(false);
    
    // Visual feedback
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#F59E0B']
    });
  };

  const batchAiReview = () => {
    if (selectedContractIds.length === 0) return;
    const selected = managedContracts.filter(c => selectedContractIds.includes(c.id));
    const titles = selected.map(c => `《${c.title}》`).join('、');
    
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'ai',
      content: `🔍 正在对选中的 ${selected.length} 份合同进行批量 AI 风险评估：${titles}。请稍候...`,
      type: 'text'
    }]);

    handleSend(`请帮我批量分析以下合同的潜在风险和续约建议：${titles}。重点关注条款冲突和到期提醒设置是否合理。`);

    setIsBatchMode(false);
    setSelectedContractIds([]);
    setShowManagerModal(false);
  };

  const batchSetReminders = (days: number[]) => {
    setManagedContracts(prev => prev.map(c => 
      selectedContractIds.includes(c.id) ? { ...c, reminders: days } : c
    ));
    setSelectedContractIds([]);
    setIsBatchMode(false);
  };

  const toggleSelectContract = (id: string) => {
    setSelectedContractIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const generateInsightPoster = async () => {
    if (!aiInsight) return;
    setIsGeneratingPoster(true);
    
    const userNickname = "ybt2370498168"; // Derived from user email
    const memberBadge = isMember 
      ? `
        <div style="background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #d97706 100%); 
                    color: #78350f; 
                    padding: 4px 12px; 
                    border-radius: 8px; 
                    font-size: 11px; 
                    font-weight: 900; 
                    display: inline-flex; 
                    align-items: center; 
                    gap: 4px;
                    box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    position: relative;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V18H19V19Z"/></svg>
          终身会员
        </div>` 
      : '<div style="background: rgba(255,255,255,0.15); color: white; padding: 4px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; border: 1px solid rgba(255,255,255,0.1);">普通用户</div>';

    // Create a temporary hidden element for the poster
    const posterEl = document.createElement('div');
    posterEl.style.position = 'fixed';
    posterEl.style.left = '-9999px';
    posterEl.style.top = '0';
    posterEl.style.width = '375px';
    posterEl.style.padding = '50px 40px';
    posterEl.style.background = '#0a0a1a'; // Even darker base for better contrast
    posterEl.style.color = 'white';
    posterEl.style.fontFamily = '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
    posterEl.style.borderRadius = '0';
    posterEl.style.overflow = 'hidden';
    
    posterEl.innerHTML = `
      <!-- Background Mesh & Shapes -->
      <div style="position: absolute; top: -100px; right: -100px; width: 300px; height: 300px; background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%); z-index: 0;"></div>
      <div style="position: absolute; bottom: -50px; left: -50px; width: 250px; height: 250px; background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%); z-index: 0;"></div>
      
      <div style="position: relative; z-index: 10;">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 45px;">
          <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 24px; box-shadow: 0 8px 16px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);">Y</div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 18px; font-weight: 800; color: white; letter-spacing: -0.5px;">${userNickname}</span>
              ${memberBadge}
            </div>
            <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">点签 AI 赋能中心 · 深度探索者</div>
          </div>
        </div>

        <div style="margin-bottom: 12px; color: #818cf8; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; font-weight: 800;">AI INSIGHT DAILY</div>
        
        <!-- Title with high contrast gold-to-white gradient -->
        <div style="font-size: 42px; font-weight: 900; margin-bottom: 28px; line-height: 1.1; letter-spacing: -1.5px; background: linear-gradient(135deg, #fbbf24 0%, #ffffff 50%, #fde68a 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 4px 10px rgba(0,0,0,0.3);">
          今日 AI<br/>赋能动态
        </div>
        
        <div style="position: relative; margin-bottom: 60px;">
          <!-- Content Box: Removed backdrop-filter to prevent rendering bugs, using solid low-opacity color -->
          <div style="background: rgba(255,255,255,0.06); padding: 35px; border-radius: 28px; font-size: 19px; line-height: 1.7; border: 1px solid rgba(255,255,255,0.1); color: #f1f5f9; font-weight: 500; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
            <div style="position: absolute; top: 15px; left: 15px; font-size: 40px; color: #fbbf24; opacity: 0.4; font-family: serif; line-height: 1;">“</div>
            ${aiInsight.content}
            <div style="position: absolute; bottom: 5px; right: 20px; font-size: 40px; color: #fbbf24; opacity: 0.4; font-family: serif; line-height: 1; transform: rotate(180deg);">“</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 35px;">
          <div>
            <div style="font-size: 13px; color: #818cf8; margin-bottom: 6px; font-weight: 700; letter-spacing: 1px;">${aiInsight.date}</div>
            <div style="font-size: 20px; font-weight: 900; color: white; letter-spacing: 0.5px;">点签智能顾问</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600;">Intelligence Powered by Gemini 3.1</div>
          </div>
          <div style="text-align: center;">
            <div style="width: 80px; height: 80px; background: white; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: #0f172a; font-weight: 900; font-size: 12px; text-align: center; padding: 8px; box-shadow: 0 15px 30px rgba(0,0,0,0.4); margin-bottom: 10px; border: 4px solid #1e1b4b;">
              扫码加入<br/>AI 时代
            </div>
            <div style="font-size: 10px; color: #94a3b8; font-weight: 700; letter-spacing: 1px;">长按识别</div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(posterEl);
    
    try {
      const canvas = await html2canvas(posterEl, {
        scale: 2,
        backgroundColor: null,
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `AI_Insight_Poster_${new Date().getTime()}.png`;
      link.click();
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#ffffff']
      });
    } catch (error) {
      console.error('Poster Generation Error:', error);
    } finally {
      document.body.removeChild(posterEl);
      setIsGeneratingPoster(false);
    }
  };

  const fetchAIInsight = async () => {
    setIsInsightLoading(true);
    try {
      const response = await callGeminiWithRetry({
        model: "gemini-3-flash-preview",
        contents: "请搜索并生成一条关于今天或最近 24 小时内 AI 领域的重大新闻或应用突破。内容应体现 AI 如何赋能行业。语言要专业且具有前瞻性，字数在 120 字以内。格式要求：直接输出内容，不要包含标题或引言。",
        config: {
          systemInstruction: "你是一个专业的 AI 行业分析师，擅长利用实时搜索获取最新资讯并进行深度解读。",
          temperature: 0.7,
          tools: [{ googleSearch: {} }]
        }
      });
      
      if (response.text) {
        setAiInsight({
          content: response.text,
          date: new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
        });
      }
    } catch (error) {
      console.error("Failed to fetch AI insight:", error);
      // Fallback insight
      setAiInsight({
        content: "AI 赋能中心提醒：今日 AI 领域多项大模型更新，重点关注 AI 在自动化办公与智能法务领域的效率提升。建议尝试使用‘角色扮演’指令来获得更精准的法律建议。",
        date: new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
      });
    } finally {
      setIsInsightLoading(false);
    }
  };

  const renderHighlightedText = (text: string, risks: any[]) => {
    if (!risks || risks.length === 0) return text;

    // Sort risks by phrase length (descending) to avoid partial matches
    const sortedRisks = [...risks].sort((a, b) => b.phrase.length - a.phrase.length);

    let result: (string | React.ReactNode)[] = [text];

    let keyCounter = 0;
    sortedRisks.forEach((risk) => {
      const newResult: (string | React.ReactNode)[] = [];
      result.forEach((part) => {
        if (typeof part === 'string') {
          const phrase = risk.phrase;
          if (!phrase) {
            newResult.push(part);
            return;
          }
          
          // Escape regex special characters
          const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${escapedPhrase})`, 'gi');
          const splitParts = part.split(regex);
          
          splitParts.forEach((splitPart) => {
            if (splitPart.toLowerCase() === phrase.toLowerCase()) {
              const severityColor = 
                risk.severity === 'high' ? 'bg-red-100 text-red-700 border-red-300' :
                risk.severity === 'medium' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                'bg-yellow-100 text-yellow-700 border-yellow-300';
              
              const SeverityIcon = 
                risk.severity === 'high' ? AlertOctagon :
                risk.severity === 'medium' ? AlertTriangle :
                AlertCircle;

              newResult.push(
                <span 
                  key={`risk-${risk.phrase}-${risk.severity}-${keyCounter++}`}
                  className={`${severityColor} px-1 rounded border-b-2 cursor-help relative group inline-flex items-center gap-0.5`}
                >
                  <SeverityIcon className="w-3 h-3" />
                  {splitPart}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-[11px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-white/10">
                    <div className="font-bold mb-1 flex items-center gap-1">
                      <SeverityIcon className="w-3 h-3" />
                      {risk.severity === 'high' ? '高风险' : risk.severity === 'medium' ? '中风险' : '低风险'}
                    </div>
                    <div className="opacity-90">{risk.suggestion}</div>
                    <div className="mt-2 pt-2 border-t border-white/10 text-[10px] italic opacity-70">
                      {risk.reason}
                    </div>
                  </span>
                </span>
              );
            } else {
              newResult.push(splitPart);
            }
          });
        } else {
          newResult.push(part);
        }
      });
      result = newResult;
    });

    return result;
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reviewFileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const EMOTIONAL_RESPONSES = [
    { text: "加油！点点会一直陪着您的！🚀", mood: "excited", animation: "bounce" },
    { text: "法律上的事交给我，您只管放心工作！🛡️", mood: "confident", animation: "shake" },
    { text: "今天也是元气满满的一天，点点为您保驾护航！✨", mood: "happy", animation: "spin" },
    { text: "您的专业度真是让人佩服，合作愉快！🤝", mood: "proud", animation: "pulse" },
    { text: "累了就歇歇，点点会一直在这里守护您的合同安全.☕", mood: "gentle", animation: "float" }
  ];

  const handleAssistantClick = () => {
    const randomResponse = EMOTIONAL_RESPONSES[Math.floor(Math.random() * EMOTIONAL_RESPONSES.length)];
    setAssistantText(randomResponse.text);
    setAssistantMood(randomResponse.mood);
    setAssistantAnimation(randomResponse.animation);
    setShowAssistantBubble(true);
    
    // Reset animation after a short delay
    setTimeout(() => setAssistantAnimation('float'), 1000);
  };

  const [userProfile, setUserProfile] = useState({
    name: '张先生',
    phone: '138****8888',
    industry: '物流运输',
    role: '创始人/CEO',
    companySize: '10-50人',
    monthlyVolume: '50-100份',
    mainScenario: '销售合同、劳动合同'
  });

  const [editName, setEditName] = useState(userProfile.name);
  const [editPhone, setEditPhone] = useState(userProfile.phone);
  const [editIndustry, setEditIndustry] = useState(userProfile.industry);
  const [editRole, setEditRole] = useState(userProfile.role);
  const [editCompanySize, setEditCompanySize] = useState(userProfile.companySize);
  const [editMonthlyVolume, setEditMonthlyVolume] = useState(userProfile.monthlyVolume);
  const [editMainScenario, setEditMainScenario] = useState(userProfile.mainScenario);
  const [reviewContent, setReviewContent] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const exportToPDF = async (elementId: string, filename: string = 'contract.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Workaround for html2canvas not supporting oklch() colors used in Tailwind 4
          const styles = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styles.length; i++) {
            styles[i].innerHTML = styles[i].innerHTML.replace(/oklch\([^)]+\)/g, '#000000');
          }
          // Also check inline styles
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            if (el.style && el.style.cssText.includes('oklch')) {
              el.style.cssText = el.style.cssText.replace(/oklch\([^)]+\)/g, '#000000');
            }
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(filename);
    } catch (error) {
      console.error('PDF Export Error:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchAIInsight();
  }, []);

  const TaskIcon = ({ name, className }: { name: string, className?: string }) => {
    const icons: Record<string, any> = {
      Calendar,
      Share2,
      UserPlus,
      UserCheck,
      Sparkles,
      Gift: Award,
      Coins: CircleDollarSign,
      Play,
      ShieldCheck,
      FileUp
    };
    const Icon = icons[name] || Info;
    return <Icon className={className} />;
  };

  // Generate Contract Cover
  const handleGenerateCover = async () => {
    if (!coverPrompt.trim()) return;
    
    setIsGeneratingCover(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `A professional, minimalist, high-end corporate contract cover design for: ${coverPrompt}. 
                     Style: Modern, clean, elegant typography, corporate blue and gold accents, 4k resolution, high quality. 
                     No realistic people, focus on abstract geometric shapes and professional layout.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          setGeneratedCoverUrl(`data:image/png;base64,${base64Data}`);
          break;
        }
      }
    } catch (error) {
      console.error('Error generating cover:', error);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleSend = async (text: string = inputValue, fileData?: { name: string; type: string; data: string }) => {
    if (!text.trim() && !fileData) return;

    const userMsg: Message = { 
      id: generateId(), 
      role: 'user', 
      content: text,
      type: fileData ? 'file' : 'text',
      file: fileData ? { name: fileData.name, type: fileData.type, data: fileData.data } : undefined
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setUploadedFile(null);
    setIsTyping(true);

    try {
      // Logic to determine next level suggestions
      let nextLevel = currentLevel;
      const foundLevel = QUESTION_LIBRARY.find(l => l.questions.includes(text));
      if (foundLevel) {
        nextLevel = Math.min(foundLevel.level + 1, 4);
      } else {
        nextLevel = Math.min(currentLevel + 1, 4);
      }
      setCurrentLevel(nextLevel);

      const levelData = QUESTION_LIBRARY.find(l => l.level === nextLevel);
      const suggestions = levelData 
        ? [...levelData.questions].sort(() => 0.5 - Math.random()).slice(0, 4)
        : [];

      // Special handling for specific keywords to match screenshots
      if (text.includes('399终身会员')) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'ai',
            content: '这是点签为小微企业量身定制的超值会员服务。一次性付费，终身享受专业电子合同权益，助力您的业务高效、合规发展。',
            type: 'membership'
          }]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      if (text.includes('成功案例')) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'ai',
            content: '好的，请选择您感兴趣的行业，查看点签如何助力数字化转型：',
            type: 'options',
            options: ['物流运输', '医疗健康', '人力资源', '金融保险', '房地产建筑']
          }]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      if (text === '物流运输') {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'ai',
            content: '',
            type: 'case',
            caseData: {
              image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800',
              title: '某大型物流平台如何通过点签降低60%法务成本',
              description: '该物流平台通过点签实现了全流程数字化签署，解决了司机异地签署难、纸质合同易丢失的问题，合同归档效率提升了400%。'
            }
          }]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      if (text === '医疗健康') {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'ai',
            content: '',
            type: 'case',
            caseData: {
              image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800',
              title: '智慧医疗：某三甲医院电子知情同意书实践',
              description: '通过点签电子签名技术，患者及家属可在移动端快速签署手术知情同意书，确保了签署过程的法律效力，同时实现了病案管理的全面无纸化。'
            }
          }]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      if (text === '人力资源') {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'ai',
            content: '',
            type: 'case',
            caseData: {
              image: 'https://images.unsplash.com/photo-1521791136064-7986c2959210?auto=format&fit=crop&q=80&w=800',
              title: '某跨国名企：万名员工入职合同云端秒签',
              description: '针对校招季海量合同签署需求，点签提供批量发送与身份核验功能，HR无需面对面即可完成合同签署，入职办理时间从3天缩短至10分钟。'
            }
          }]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      if (text === '金融保险') {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'ai',
            content: '',
            type: 'case',
            caseData: {
              image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800',
              title: '某头部险企：保单签署合规性与效率双提升',
              description: '点签为保险行业提供高强度身份认证与时间戳服务，确保每一份电子保单不可篡改，有效防范了代签名风险，理赔纠纷率降低了35%。'
            }
          }]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      if (text === '房地产建筑') {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'ai',
            content: '',
            type: 'case',
            caseData: {
              image: 'https://images.unsplash.com/photo-1503387762-592dee58c460?auto=format&fit=crop&q=80&w=800',
              title: '某地产龙头：供应链采购合同数字化管理',
              description: '通过点签与ERP系统的深度集成，实现了数千家供应商合同的自动化签署与智能归档，供应链协同效率提升了50%，纸张与邮寄成本节省数百万。'
            }
          }]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      // Default AI response
      const isReviewRequest = text.includes('审查') || text.includes('风险') || text.includes('建议') || text.includes('分析') || text.includes('看下') || text.includes('检查') || text.includes('合规') || text.includes('法律') || text.includes('修改') || text.includes('条款') || text.includes('规避') || (fileData && fileData.type.startsWith('image'));
      const isDraftingRequest = text.includes('草拟') || text.includes('拟定') || text.includes('写一份') || text.includes('生成合同') || text.includes('劳务合同') || text.includes('租赁合同') || text.includes('保密协议');
      
      const userContext = `当前用户信息：姓名 ${userProfile.name}，行业 ${userProfile.industry}，职位 ${userProfile.role}，公司规模 ${userProfile.companySize}，月均合同量 ${userProfile.monthlyVolume}，主要使用场景 ${userProfile.mainScenario}。`;
      
      let systemInstruction = "";
      if (isReviewRequest) {
        systemInstruction = `你是一位资深的法律合规专家。${userContext} 请结合用户的行业背景和使用场景，对用户提供的合同内容（可能是文本或图片）进行深度审查，识别潜在的法律风险（如条款模糊、责任不对等、核心条款缺失等），并给出专业的修改建议。请使用清晰的列表格式回答，并保持专业严谨的语气。回答最后请根据当前对话生成3个后续问题建议，每个建议应是一个完整的短句。必须以 [SUGGESTIONS] 开头，每个建议占一行，并以数字开头，例如：\n[SUGGESTIONS]\n1. 第一个建议\n2. 第二个建议\n3. 第三个建议`;
      } else if (isDraftingRequest) {
        systemInstruction = `你是一位专业的法律文书专家。${userContext} 请根据用户的需求，草拟一份专业的合同或法律协议。合同应包含核心条款、双方权利义务、违约责任、争议解决等。请使用规范的合同格式，第一行应为合同标题。回答最后请根据当前对话生成3个后续问题建议，每个建议应是一个完整的短句。必须以 [SUGGESTIONS] 开头，每个建议占一行，并以数字开头，例如：\n[SUGGESTIONS]\n1. 第一个建议\n2. 第二个建议\n3. 第三个建议`;
      } else {
        systemInstruction = `你是点签平台的智能顾问。${userContext} 请根据用户的行业和职位背景，提供更有针对性的建议。你擅长解答电子合同、法律合规、会员权益（特别是399终身会员）等问题。回答要简洁明了，适合手机端阅读。回答最后请根据当前对话生成3个后续问题建议，每个建议应是一个完整的短句。必须以 [SUGGESTIONS] 开头，每个建议占一行，并以数字开头，例如：\n[SUGGESTIONS]\n1. 第一个建议\n2. 第二个建议\n3. 第三个建议`;
      }

      const model = "gemini-3-flash-preview";
      
      const parts: any[] = [{ text: text || "请分析这张合同图片中的内容并给出法律建议。" }];
      if (fileData && fileData.type.startsWith('image')) {
        parts.push({
          inlineData: {
            data: fileData.data,
            mimeType: fileData.type
          }
        });
      }

      const result = await callGeminiWithRetry({
        model,
        contents: [{ role: 'user', parts: parts }],
        config: {
          systemInstruction: systemInstruction,
          tools: [{ googleSearch: {} }],
          maxOutputTokens: 8192
        }
      });

      const fullContent = result.text || "抱歉，我暂时无法回答这个问题。";
      let displayContent = fullContent;
      let finalSuggestions = suggestions;

      const suggestionsTagMatch = fullContent.match(/\[SUGGESTIONS\][:：]?/i);
      if (suggestionsTagMatch) {
        const splitParts = fullContent.split(suggestionsTagMatch[0]);
        displayContent = splitParts[0].trim();
        // Improved parsing: split by comma, newline, semicolon, or numbered list format
        const aiSuggestions = splitParts[1]
          .split(/,|\n|;|，|；|(?=\d+[\.、\s])/)
          .map(s => s.replace(/^\d+[\.、\s]*/, '').trim())
          .filter(s => s.length > 4); // Filter out too short suggestions
        
        if (aiSuggestions.length > 0) {
          finalSuggestions = aiSuggestions.slice(0, 3);
        }
      }

      const aiMsg: Message = { 
        id: generateId(), 
        role: 'ai', 
        content: displayContent,
        suggestions: finalSuggestions,
        isPremium: isReviewRequest,
        type: isDraftingRequest ? 'contract' : 'text'
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error("AI Error:", error);
      const errorStr = JSON.stringify(error);
      const isQuotaExceeded = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED');
      
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'ai',
        content: isQuotaExceeded 
          ? '抱歉，当前 AI 服务请求量过大（配额已耗尽），请稍后再试或联系客服。' 
          : '抱歉，我遇到了一些技术问题，无法完成您的请求。',
        type: 'text',
        suggestions: ['什么是 399 终身会员？', '如何手动上传合同？']
      }]);
    } finally {
      setIsTyping(false);
    }
  };
  
  const handleReviewAnalysis = async () => {
    if (!reviewContent.trim() && !uploadedFile) return;
    
    setIsReviewing(true);
    setReviewAnalysis(null);
    
    try {
      const userContext = `当前用户信息：姓名 ${userProfile.name}，行业 ${userProfile.industry}，职位 ${userProfile.role}，公司规模 ${userProfile.companySize}，月均合同量 ${userProfile.monthlyVolume}，主要使用场景 ${userProfile.mainScenario}。`;
      const systemInstruction = `你是一位资深的法律合规专家。${userContext} 请对用户提供的合同内容进行深度审查，识别潜在的法律风险（如条款模糊、责任不对等、核心条款缺失等），并给出专业的修改建议。
      
      请以 JSON 格式返回结果，包含以下字段：
      - contractText: 如果输入是图片或PDF，请提供提取出的合同文本。如果合同内容非常长（超过 5000 字），请仅提供前 5000 字。如果是纯文本输入，此字段可为空。
      - summary: 合同整体风险概览（简短）
      - risks: 风险项列表，每个风险项包含：
        - phrase: 合同中存在风险的具体短语或句子（必须与原合同内容完全一致，以便进行高亮显示）
        - severity: 风险等级（'high', 'medium', 'low'）
        - suggestion: 修改建议
        - reason: 风险原因
      `;
      
      const model = "gemini-3-flash-preview";
      const parts: any[] = [{ text: reviewContent || "请分析这张合同文件中的内容并给出法律建议。" }];
      
      if (uploadedFile && (uploadedFile.type.startsWith('image') || uploadedFile.type === 'application/pdf')) {
        parts.push({
          inlineData: {
            data: uploadedFile.data,
            mimeType: uploadedFile.type
          }
        });
      }

      const response = await callGeminiWithRetry({
        model,
        contents: [{ role: 'user', parts: parts }],
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              contractText: { type: Type.STRING },
              summary: { type: Type.STRING },
              risks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phrase: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                    suggestion: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ['phrase', 'severity', 'suggestion', 'reason']
                }
              }
            },
            required: ['summary', 'risks']
          }
        }
      });

      const analysis = JSON.parse(response.text || "{}");
      if (analysis.contractText && !reviewContent) {
        setReviewContent(analysis.contractText);
      }
      setReviewAnalysis(analysis);
    } catch (error: any) {
      console.error("Review Analysis Error:", error);
      const errorStr = JSON.stringify(error);
      const isQuotaExceeded = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED');
      
      setReviewAnalysis({ 
        summary: isQuotaExceeded 
          ? "AI 服务配额已耗尽，请稍后再试。您可以先手动阅读合同条款。" 
          : "分析过程中出现错误，请检查网络或重试。", 
        risks: [] 
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>, isReview: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        const base64Data = result.split(',')[1];
        const fileInfo = {
          name: file.name,
          type: file.type,
          data: base64Data
        };

        if (isReview) {
          if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            const text = await file.text();
            setReviewContent(text);
          } else if (file.type.startsWith('image/')) {
            setUploadedFile(fileInfo);
            setReviewContent(`[已上传图片: ${file.name}]`);
          } else {
            setReviewContent(`[已上传文件: ${file.name}，请点击下方按钮开始分析]`);
            setUploadedFile(fileInfo);
          }
        } else {
          setUploadedFile(fileInfo);
        }
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File upload error:", error);
      setIsUploading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('您的浏览器不支持语音识别功能，请尝试使用 Chrome 或 Edge 浏览器。');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    recognitionRef.current.start();
  };

  const templates = [
    { 
      id: '1', 
      title: '通用劳动合同', 
      category: '人力资源', 
      description: '适用于标准劳动关系，包含薪资、社保、岗位等核心条款。',
      requiredFields: [
        { key: 'employer', label: '用人单位名称', placeholder: '如：点签科技有限公司' },
        { key: 'employee', label: '劳动者姓名', placeholder: '如：张三' },
        { key: 'position', label: '工作岗位', placeholder: '如：软件工程师' },
        { key: 'salary', label: '月工资标准', placeholder: '如：15000' },
        { key: 'startDate', label: '合同起始日期', placeholder: '如：2024-01-01' }
      ]
    },
    { 
      id: '2', 
      title: '房屋租赁协议', 
      category: '个人生活', 
      description: '涵盖租金支付、押金退还、违约责任等详尽条款。',
      requiredFields: [
        { key: 'landlord', label: '出租人姓名', placeholder: '如：李四' },
        { key: 'tenant', label: '承租人姓名', placeholder: '如：王五' },
        { key: 'address', label: '房屋地址', placeholder: '如：北京市朝阳区XX小区' },
        { key: 'rent', label: '月租金金额', placeholder: '如：5000' },
        { key: 'deposit', label: '押金金额', placeholder: '如：5000' }
      ]
    },
    { 
      id: '3', 
      title: '商业保密协议 (NDA)', 
      category: '企业合规', 
      description: '保护企业核心商业秘密，明确泄密赔偿标准。',
      requiredFields: [
        { key: 'partyA', label: '甲方名称', placeholder: '如：点签科技有限公司' },
        { key: 'partyB', label: '乙方名称', placeholder: '如：某某合作伙伴' },
        { key: 'purpose', label: '合作目的', placeholder: '如：技术交流与商务洽谈' },
        { key: 'duration', label: '保密期限', placeholder: '如：3年' }
      ]
    },
    { 
      id: '4', 
      title: '产品销售合同', 
      category: '贸易往来', 
      description: '规范货物交付、质量验收及货款结算流程。',
      requiredFields: [
        { key: 'seller', label: '出卖人名称', placeholder: '如：点签科技有限公司' },
        { key: 'buyer', label: '买受人名称', placeholder: '如：某某分销商' },
        { key: 'product', label: '产品名称', placeholder: '如：电子签名系统' },
        { key: 'quantity', label: '产品数量', placeholder: '如：100套' },
        { key: 'price', label: '产品单价', placeholder: '如：399' }
      ]
    },
    { 
      id: '5', 
      title: '技术开发协议', 
      category: 'IT/软件', 
      description: '明确知识产权归属、开发进度及验收标准。',
      requiredFields: [
        { key: 'client', label: '委托方名称', placeholder: '如：某某大型企业' },
        { key: 'developer', label: '开发方名称', placeholder: '如：点签科技有限公司' },
        { key: 'project', label: '项目名称', placeholder: '如：AI智能法务助手' },
        { key: 'fee', label: '开发费用', placeholder: '如：200000' }
      ]
    },
  ];

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFullscreen = (e: MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      } else if ((videoRef.current as any).msRequestFullscreen) {
        (videoRef.current as any).msRequestFullscreen();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F7F7F7] max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center overflow-hidden shadow-sm border-2 border-white">
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=DianDian&backgroundColor=007AFF" alt="IP Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-[16px] font-bold text-gray-800 leading-tight">点签 <span className="text-brand-blue">AI</span></h1>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">DianDian Assistant</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2.5 py-1.5 rounded-full text-[11px] font-bold border border-orange-100 shadow-sm"
          >
            <CircleDollarSign className="w-3.5 h-3.5" />
            <span>{userPoints} 积分</span>
          </button>
          <button 
            onClick={() => setShowClearConfirmModal(true)}
            className="p-1.5 text-gray-500 bg-gray-50 rounded-full"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              setEditName(userProfile.name);
              setEditPhone(userProfile.phone);
              setEditIndustry(userProfile.industry);
              setEditRole(userProfile.role);
              setEditCompanySize(userProfile.companySize);
              setEditMonthlyVolume(userProfile.monthlyVolume);
              setEditMainScenario(userProfile.mainScenario);
              setShowProfileModal(true);
            }}
            className="p-1.5 text-gray-600 bg-gray-50 rounded-full"
          >
            <User className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowFeedbackModal(true)}
            className="p-1.5 text-gray-500 bg-gray-50 rounded-full"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-1 bg-blue-50 text-brand-blue px-3 py-1.5 rounded-full text-[12px] font-bold">
            <Headphones className="w-4 h-4" />
            <span>转人工</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Industry Pitfall Prevention Module */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldAlert className="w-24 h-24 text-brand-blue" />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-800">各行各业法律避坑指南</h2>
                  <p className="text-[10px] text-gray-400">AI 深度解析 · 规避电子合同风险</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                实时更新
              </span>
            </div>

            {/* Search and Filter */}
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="搜索行业、坑点或建议..."
                  value={pitfallSearchQuery}
                  onChange={(e) => setPitfallSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {['全部', '服务业', '资产类', '金融类', '技术类', '制造类'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setPitfallCategory(cat)}
                    className={`shrink-0 px-3 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      pitfallCategory === cat 
                        ? 'bg-brand-blue text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
              {industryPitfalls
                .filter(item => {
                  const matchesSearch = item.industry.includes(pitfallSearchQuery) || 
                                      item.pitfall.includes(pitfallSearchQuery) || 
                                      item.tip.includes(pitfallSearchQuery);
                  const matchesCategory = pitfallCategory === '全部' || item.category === pitfallCategory;
                  return matchesSearch && matchesCategory;
                })
                .map((item, idx) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 hover:border-brand-blue/30 hover:bg-white transition-all group/item"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center text-white shadow-lg shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800">{item.industry}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                            item.riskLevel === '极高' ? 'bg-red-100 text-red-600' :
                            item.riskLevel === '高' ? 'bg-orange-100 text-orange-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {item.riskLevel}风险
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            handleSend(`我想咨询${item.industry}领域的法律避坑建议，特别是关于${item.action}。`);
                            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                          }}
                          className="text-[10px] font-bold text-brand-blue flex items-center gap-0.5 bg-brand-blue/5 px-2 py-1 rounded-lg hover:bg-brand-blue/10 transition-colors"
                        >
                          {item.action} <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-red-500 leading-relaxed flex items-start gap-1">
                          <span className="shrink-0 mt-0.5">⚠️</span>
                          <span className="font-medium">常见坑点：{item.pitfall}</span>
                        </p>
                        <div className="bg-white/60 p-2 rounded-xl border border-gray-100">
                          <p className="text-[10px] text-gray-600 leading-relaxed italic">
                            {item.tip}
                          </p>
                        </div>
                        
                        {/* Expandable Details */}
                        <div className="mt-2">
                          <button 
                            onClick={() => setExpandedPitfall(expandedPitfall === item.id ? null : item.id)}
                            className="text-[9px] text-gray-400 hover:text-brand-blue flex items-center gap-1 transition-colors"
                          >
                            {expandedPitfall === item.id ? '收起详情' : '查看法律依据与案例'} 
                            <ChevronDown className={`w-2.5 h-2.5 transition-transform ${expandedPitfall === item.id ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {expandedPitfall === item.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="mt-2 space-y-2 overflow-hidden"
                            >
                              <div className="bg-brand-blue/5 p-2 rounded-xl border border-brand-blue/10">
                                <p className="text-[9px] text-brand-blue font-bold mb-1 flex items-center gap-1">
                                  <BookOpen className="w-2.5 h-2.5" /> 法律依据
                                </p>
                                <p className="text-[9px] text-gray-500 leading-relaxed">
                                  {item.legalBasis}
                                </p>
                              </div>
                              <a 
                                href={item.caseLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-gray-100 p-2 rounded-xl border border-gray-200 hover:bg-gray-200 transition-colors"
                              >
                                <p className="text-[9px] text-gray-600 font-bold flex items-center justify-between">
                                  <span className="flex items-center gap-1"><Scale className="w-2.5 h-2.5" /> 相关司法判例</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </p>
                              </a>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Banner */}
        <div className="bg-[#FFF9E6] border border-[#FFEBB3] rounded-full py-2 px-4 flex items-center justify-between mx-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎁</span>
            <p className="text-[#8B4513] text-[13px]">您已进入【399终身会员】专属咨询通道</p>
          </div>
          <button 
            onClick={() => setShowTaskModal(true)}
            className="text-[11px] font-bold text-orange-600 flex items-center gap-0.5 bg-orange-100/50 px-2 py-1 rounded-full"
          >
            做任务赚积分 <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="text-center text-gray-400 text-xs py-2">今天 09:30</div>

        {messages.map((msg) => (
          <motion.div 
            key={msg.id} 
            initial={{ opacity: 0, y: 10, scale: msg.role === 'ai' ? 0.95 : 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              type: msg.role === 'ai' ? "spring" : "tween",
              stiffness: 260,
              damping: 20,
              duration: 0.3
            }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'ai' && (
              <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center overflow-hidden shrink-0 shadow-md border-2 border-white">
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=DianDian&backgroundColor=007AFF" alt="AI Avatar" referrerPolicy="no-referrer" />
              </div>
            )}
            {msg.role === 'user' && (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User Avatar" referrerPolicy="no-referrer" />
              </div>
            )}
            
            <div className="flex flex-col gap-3 max-w-[85%]">
              {msg.file && (
                <div className={msg.role === 'user' ? 'bg-white/20 p-2 rounded-xl mb-1' : 'bg-gray-100 p-2 rounded-xl mb-1'}>
                  {msg.file.type.startsWith('image/') ? (
                    <img 
                      src={`data:${msg.file.type};base64,${msg.file.data}`} 
                      alt={msg.file.name} 
                      className="max-w-full rounded-lg shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-5 h-5" />
                      <span className="truncate">{msg.file.name}</span>
                    </div>
                  )}
                </div>
              )}
              {msg.content && (
                <div className={msg.role === 'ai' ? 'chat-bubble-ai relative group' : 'chat-bubble-user'}>
                  {msg.role === 'ai' ? (
                    <>
                      <div className="markdown-body relative" id={`msg-${msg.id}`}>
                        <div className={`prose prose-sm max-w-none prose-slate prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-3 prose-pre:rounded-lg prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded prose-strong:text-slate-900`}>
                          <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                        </div>
                      </div>
                      <div className="absolute -right-10 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => exportToPDF(`msg-${msg.id}`, `dianqian-contract-${msg.id}.pdf`)}
                          className="p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-brand-blue"
                          title="导出 PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => speak(msg.content || "", msg.id)}
                          className={`p-2 bg-white rounded-full shadow-sm ${isSpeaking === msg.id ? 'text-brand-blue animate-pulse' : 'text-gray-400 hover:text-brand-blue'}`}
                          title="语音播报"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    msg.content
                  )}
                </div>
              )}

              {msg.type === 'contract' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI 智能草拟</div>
                      <div className="text-sm font-bold text-gray-800 truncate">
                        {msg.content.split('\n')[0].replace(/[#*]/g, '').trim() || '新草拟合同'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const title = msg.content.split('\n')[0].replace(/[#*]/g, '').trim() || 'AI 草拟合同';
                        const newContract = {
                          id: generateId(),
                          title: title,
                          partyA: userProfile.name || '本人',
                          partyB: '待确认',
                          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          status: 'active',
                          category: 'AI 草拟',
                          reminders: [30]
                        };
                        setManagedContracts(prev => [newContract, ...prev]);
                        
                        setMessages(prev => [...prev, {
                          id: generateId(),
                          role: 'ai',
                          content: `✅ 已将合同《${newContract.title}》保存至“合同管家”。您可以随时在管家中查看、编辑或发起签署。`,
                          type: 'text'
                        }]);
                        
                        confetti({
                          particleCount: 100,
                          spread: 70,
                          origin: { y: 0.6 }
                        });
                      }}
                      className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[11px] font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      保存至管家
                    </button>
                    <button 
                      onClick={() => exportToPDF(`msg-${msg.id}`, `drafted-contract.pdf`)}
                      className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-[11px] font-bold active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      导出 PDF
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Special Message Types */}
              {msg.type === 'membership' && (
                <div className="bg-brand-gold border border-[#F0D0A0] rounded-2xl p-4 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-6 bg-black/5 flex items-center px-3 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={`signup-${signupIndex}-${recentSignups[signupIndex]}`}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="text-[10px] text-brand-gold-text/60 font-medium"
                      >
                        🔥 {recentSignups[signupIndex]}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center gap-2 mb-3 mt-4">
                    <span className="text-xl">👑</span>
                    <h3 className="text-brand-gold-text font-bold text-lg">399元终身创客会员</h3>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <span className="bg-blue-50 text-brand-blue text-[11px] px-2 py-0.5 rounded-full border border-blue-100">终身有效</span>
                    <span className="bg-blue-50 text-brand-blue text-[11px] px-2 py-0.5 rounded-full border border-blue-100">200份额度</span>
                    <span className="bg-blue-50 text-brand-blue text-[11px] px-2 py-0.5 rounded-full border border-blue-100">50%分润</span>
                  </div>
                  <div className="text-center text-gray-400 line-through text-xs mb-3">原价 ¥2999</div>
                  <button 
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                  >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/7a/WeChat_logo.svg" className="w-5 h-5 invert" alt="WeChat" />
                    微信一键授权，限时抢占名额 &gt;
                  </button>
                  <div className="absolute bottom-0 right-0 bg-[#F0D0A0] text-[#8B4513] text-[10px] px-2 py-0.5 rounded-tl-lg font-bold">Hot 推荐</div>
                </div>
              )}

              {msg.type === 'options' && (
                <div className="flex flex-wrap gap-2">
                  {msg.options?.map((opt, idx) => (
                    <button 
                      key={`${opt}-${idx}`}
                      onClick={() => handleSend(opt)}
                      className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-[14px] text-gray-700 shadow-sm active:bg-gray-50"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {msg.type === 'case' && msg.caseData && (
                <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
                  <img src={msg.caseData.image} className="w-full h-40 object-cover" alt="Case" referrerPolicy="no-referrer" />
                  <div className="p-4">
                    <h4 className="font-bold text-[16px] mb-2 leading-tight">{msg.caseData.title}</h4>
                    <p className="text-gray-500 text-[13px] leading-relaxed mb-4">{msg.caseData.description}</p>
                    <button className="flex items-center gap-1 text-brand-blue text-[14px] font-medium ml-auto">
                      查看完整方案 <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {msg.suggestions && msg.suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 space-y-2 relative"
                >
                  <div className="text-[11px] text-gray-400 font-medium">您可能还想了解：</div>
                  <div className="flex flex-col gap-2 items-start">
                    {msg.suggestions.map((suggestion, idx) => (
                      <button 
                        key={`suggestion-${msg.id}-${idx}`}
                        onClick={() => handleSend(suggestion)}
                        className="bg-blue-50/50 border border-blue-100 rounded-2xl px-4 py-2.5 text-[13px] text-brand-blue shadow-sm active:bg-blue-100 transition-all text-left hover:border-blue-300 max-w-full"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0" />
                          <span>{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Initial Action Buttons (Only for first AI message) */}
              {msg.id === '1' && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={() => handleSend('企业版 vs 个人版？')} className="bg-white border border-gray-200 rounded-full px-3 py-1.5 text-[12px] text-gray-700 shadow-sm active:bg-gray-50 flex items-center gap-1">
                    <span>企业版 vs 个人版？</span>
                    <ChevronRight className="w-3 h-3 text-brand-blue" />
                  </button>
                  <button onClick={() => handleSend('如何草拟合同？')} className="bg-white border border-gray-200 rounded-full px-3 py-1.5 text-[12px] text-gray-700 shadow-sm active:bg-gray-50 flex items-center gap-1">
                    <span>如何草拟合同？</span>
                    <ChevronRight className="w-3 h-3 text-brand-blue" />
                  </button>
                  <button onClick={() => handleSend('法律效力？')} className="bg-white border border-gray-200 rounded-full px-3 py-1.5 text-[12px] text-gray-700 shadow-sm active:bg-gray-50 flex items-center gap-1">
                    <span>法律效力？</span>
                    <ChevronRight className="w-3 h-3 text-brand-blue" />
                  </button>
                  <button onClick={() => setShowMembershipModal(true)} className="bg-brand-gold/10 border border-brand-gold/30 rounded-full px-3 py-1.5 text-[12px] text-brand-gold-text shadow-sm active:bg-brand-gold/20 flex items-center gap-1 font-bold">
                    <span>399终身会员权益</span>
                    <ChevronRight className="w-3 h-3 text-brand-gold-text" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center overflow-hidden shrink-0 shadow-md border-2 border-white">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=DianDian&backgroundColor=007AFF" alt="AI Avatar" referrerPolicy="no-referrer" />
            </div>
            <div className="chat-bubble-ai w-full max-w-[280px] space-y-2.5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-brand-blue/40 rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-brand-blue/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-brand-blue/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[10px] text-brand-blue/60 font-bold uppercase tracking-widest">AI 正在思考中...</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full w-full animate-pulse" />
              <div className="h-3 bg-gray-100 rounded-full w-[90%] animate-pulse [animation-delay:0.2s]" />
              <div className="h-3 bg-gray-100 rounded-full w-[75%] animate-pulse [animation-delay:0.4s]" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Floating IP Assistant */}
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2 pointer-events-none"
        >
          {showAssistantBubble && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: 20 }}
              className="bg-white shadow-xl rounded-2xl p-3 border border-blue-50 max-w-[180px] relative mb-2 pointer-events-auto"
            >
              <p className="text-[12px] text-gray-600 font-medium leading-tight">
                {assistantText}
              </p>
              <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-blue-50 rotate-45" />
              <button 
                onClick={(e) => { e.stopPropagation(); setShowAssistantBubble(false); }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
          <motion.div 
            animate={
              assistantAnimation === 'bounce' ? { y: [0, -20, 0] } :
              assistantAnimation === 'shake' ? { x: [0, -5, 5, -5, 5, 0] } :
              assistantAnimation === 'spin' ? { rotate: [0, 360] } :
              assistantAnimation === 'pulse' ? { scale: [1, 1.1, 1] } :
              { y: [0, -8, 0] }
            }
            transition={
              assistantAnimation === 'float' ? { duration: 3, repeat: Infinity, ease: "easeInOut" } :
              { duration: 0.5 }
            }
            className={`w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden border-2 border-white cursor-pointer active:scale-90 transition-transform pointer-events-auto ${
              assistantMood === 'excited' ? 'bg-orange-400' :
              assistantMood === 'confident' ? 'bg-indigo-500' :
              assistantMood === 'proud' ? 'bg-brand-gold' :
              'bg-brand-blue'
            }`}
            onClick={handleAssistantClick}
          >
            <img 
              src="https://api.dicebear.com/7.x/bottts/svg?seed=DianDian&backgroundColor=007AFF" 
              alt="Floating IP" 
              className="w-full h-full object-cover" 
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom Input Area */}
      <div className="bg-white border-t border-gray-100 p-3 pb-8 space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button onClick={() => setShowCaseModal(true)} className="whitespace-nowrap bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1 active:scale-95 transition-transform">
            <MessageSquare className="w-3.5 h-3.5" />
            行业案例
          </button>
          <button onClick={() => setShowVideoModal(true)} className="whitespace-nowrap bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1 shadow-sm active:scale-95 transition-transform">
            <Play className="w-3.5 h-3.5" />
            视频演示
          </button>
          <button onClick={() => setShowTemplateModal(true)} className="whitespace-nowrap bg-brand-blue text-white px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1 active:scale-95 transition-transform">
            <BookOpen className="w-3.5 h-3.5" />
            模板库
          </button>
          <button onClick={() => setShowReviewModal(true)} className="whitespace-nowrap bg-orange-500 text-white px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1 active:scale-95 transition-transform">
            <ShieldAlert className="w-3.5 h-3.5" />
            合同审查
          </button>
          <button 
            onClick={() => {
              setMessages(prev => [...prev, {
                id: generateId(),
                role: 'ai',
                content: '好的，请告诉我您需要草拟什么样的合同？例如：劳务合同、房屋租赁合同、软件开发合同等。',
                type: 'options',
                options: ['劳务合同', '房屋租赁', '软件开发', '保密协议', '股权转让']
              }]);
            }}
            className="whitespace-nowrap bg-purple-600 text-white px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1 active:scale-95 transition-transform"
          >
            <PenTool className="w-3.5 h-3.5" />
            AI 草拟
          </button>
          <motion.button 
            onClick={() => setShowMembershipModal(true)} 
            className={`whitespace-nowrap ${isMember ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-brand-gold text-brand-gold-text border-[#F0D0A0]'} px-3 py-1.5 rounded-lg text-[13px] font-bold flex items-center gap-1 border active:scale-95 transition-transform`}
            animate={!isMember ? { 
              boxShadow: ["0 0 0px rgba(240,208,160,0)", "0 0 10px rgba(240,208,160,0.5)", "0 0 0px rgba(240,208,160,0)"]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Crown className={`w-3.5 h-3.5 ${isMember ? 'text-gray-400' : ''}`} />
            {isMember ? '已开通会员' : '399终身会员'}
          </motion.button>
          <button onClick={() => setShowManagerModal(true)} className="whitespace-nowrap bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1 active:scale-95 transition-transform">
            <ClipboardCheck className="w-3.5 h-3.5" />
            合同管家
          </button>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 shadow-inner focus-within:bg-white focus-within:border-brand-blue transition-all">
            <input 
              type="text" 
              placeholder={isDrafting ? "正在草拟合同..." : "输入您的问题或需求..."}
              className="flex-1 bg-transparent outline-none text-sm"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue, uploadedFile || undefined)}
            />
            {(inputValue || uploadedFile) ? (
              <button 
                onClick={() => handleSend(inputValue, uploadedFile || undefined)}
                className="bg-brand-blue text-white p-2.5 rounded-full shadow-md active:scale-90 transition-transform"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-1"
              >
                <Plus className="w-7 h-7 text-gray-500" />
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={(e) => handleFileChange(e, false)}
              accept="image/*,.txt,.md,.pdf,.docx"
            />
          </div>
        </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Task Center Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-[32px] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                    <CircleDollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">积分任务中心</h2>
                    <p className="text-xs text-gray-400">做任务，领积分，抵现金</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={refreshTasks}
                    className={`p-2 bg-gray-100 rounded-full text-gray-400 hover:text-orange-500 transition-colors ${isInsightLoading ? 'animate-spin' : ''}`}
                    title="刷新任务"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowTaskModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Points Card */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative z-10">
                    <div className="text-sm opacity-80 mb-1">当前可用积分</div>
                    <div className="text-4xl font-black mb-4 flex items-baseline gap-1">
                      {userPoints}
                      <span className="text-sm font-normal opacity-70">pts</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="bg-white/20 px-3 py-1.5 rounded-xl text-[11px] font-bold">10积分 = 1份合同额度</div>
                      <div className="bg-white/20 px-3 py-1.5 rounded-xl text-[11px] font-bold">100积分 = 50元会员抵扣</div>
                    </div>
                  </div>
                </div>

                {/* Task List */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-1 h-4 bg-orange-500 rounded-full" />
                      赚积分任务
                    </h3>
                    <span className="text-[10px] text-gray-400 font-medium">每日 0:00 自动重置</span>
                  </div>

                  <div className="space-y-6">
                    {['daily', 'basic', 'grow'].map(category => (
                      <div key={category} className="space-y-3">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                          {category === 'daily' ? '每日必做' : category === 'basic' ? '新手任务' : '成长任务'}
                        </div>
                        {tasks.filter(t => t.category === category).map(task => (
                          <div key={task.id} className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-orange-100">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.completed ? 'bg-gray-200 text-gray-400' : 'bg-orange-100 text-orange-600'}`}>
                                <TaskIcon name={task.icon} className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-gray-800">{task.title}</div>
                                <div className="text-[11px] text-gray-400">{task.description}</div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-xs font-black text-orange-600">+{task.points}</div>
                              <button 
                                disabled={task.completed}
                                onClick={() => completeTask(task.id)}
                                className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                                  task.completed 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-orange-500 text-white shadow-md shadow-orange-500/20 active:scale-95'
                                }`}
                              >
                                {task.completed ? '已领取' : '去完成'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Redemption Section */}
                <section className="pb-8">
                  <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-1 h-4 bg-brand-blue rounded-full" />
                    积分兑换权益
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => redeemPoints(10, '1份合同签署额度')}
                      className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-brand-blue hover:shadow-md transition-all group"
                    >
                      <div className="w-8 h-8 bg-blue-50 text-brand-blue rounded-lg flex items-center justify-center mb-3 group-hover:bg-brand-blue group-hover:text-white transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-gray-800 mb-1">1份合同额度</div>
                      <div className="text-[10px] text-orange-600 font-black">10 积分</div>
                    </button>
                    <button 
                      onClick={() => redeemPoints(100, '50元会员抵扣券')}
                      className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-brand-blue hover:shadow-md transition-all group"
                    >
                      <div className="w-8 h-8 bg-blue-50 text-brand-blue rounded-lg flex items-center justify-center mb-3 group-hover:bg-brand-blue group-hover:text-white transition-colors">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-gray-800 mb-1">50元会员抵扣</div>
                      <div className="text-[10px] text-orange-600 font-black">100 积分</div>
                    </button>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}

        {/* Membership Details Modal */}
        {showMembershipModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6"
            >
              <button onClick={() => setShowMembershipModal(false)} className="absolute top-4 right-4 p-1 text-gray-400 z-20"><X className="w-6 h-6" /></button>
              <h2 className="text-center text-xl font-bold mb-8 text-brand-blue flex items-center justify-center gap-2">
                <Crown className="w-6 h-6 text-brand-gold-text" />
                399终身会员详细权益
              </h2>
              <div className="space-y-6">
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0"><FileText className="text-brand-blue" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-bold">电子合同</h4>
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">尊享</span>
                    </div>
                    <p className="text-sm text-gray-600">每年赠送 200 份法律效力合同额度</p>
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center shrink-0"><Award className="text-yellow-500" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-bold">身份标识</h4>
                      <span className="text-[10px] bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded font-bold">独家</span>
                    </div>
                    <p className="text-sm text-gray-600">专属“终身创客”金色勋章</p>
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center shrink-0"><CircleDollarSign className="text-orange-500" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-bold">返佣奖励</h4>
                      <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">高额</span>
                    </div>
                    <p className="text-sm text-gray-600">推荐新用户签署，最高享50%现金分成</p>
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-10 h-10 bg-brown-50 rounded-lg flex items-center justify-center shrink-0"><Scale className="text-amber-800" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-bold">法律支持</h4>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">专业</span>
                    </div>
                    <p className="text-sm text-gray-600">赠送一年专业法务在线咨询</p>
                  </div>
                </motion.div>
              </div>
              <button 
                onClick={() => { 
                  if (isMember) {
                    setShowMembershipModal(false);
                  } else {
                    setShowMembershipModal(false); 
                    setShowAuthModal(true); 
                  }
                }}
                className={`w-full ${isMember ? 'bg-gray-100 text-gray-400' : 'bg-[#FF6B00] text-white'} py-4 rounded-xl font-bold mt-10 shadow-lg active:scale-95 transition-transform`}
              >
                {isMember ? '您已是终身会员' : '立即授权微信，解锁以上全部权益'}
              </button>
              {!isMember && (
                <button 
                  onClick={() => { setIsMember(true); setShowMembershipModal(false); }}
                  className="w-full text-[10px] text-gray-300 mt-2 hover:text-gray-400 transition-colors"
                >
                  (测试用：点击直接模拟开通)
                </button>
              )}
              <div className="mt-4 text-center">
                <button 
                  onClick={() => { setShowMembershipModal(false); setShowTaskModal(true); }}
                  className="text-xs text-orange-600 font-bold flex items-center justify-center gap-1 mx-auto"
                >
                  <CircleDollarSign className="w-3.5 h-3.5" />
                  使用积分抵扣，最高可省50元 &gt;
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* WeChat Auth Modal */}
        {showAuthModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="modal-content p-8"
            >
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 p-1 text-gray-400"><X className="w-6 h-6" /></button>
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-2 mb-6">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/7a/WeChat_logo.svg" className="w-6 h-6" alt="WeChat" />
                  <span className="text-gray-500 font-medium">微信授权</span>
                </div>
                <h3 className="text-lg font-bold mb-2">点签 申请使用你的手机号</h3>
                <p className="text-xl font-bold mb-2">138****8888</p>
                <p className="text-gray-400 text-sm mb-8">该手机号用于接收合同签署通知及账号登录</p>
                <div className="flex gap-4 w-full">
                  <button onClick={() => setShowAuthModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold">拒绝</button>
                  <button 
                    onClick={() => { 
                      setIsMember(true); 
                      setShowAuthModal(false); 
                      confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#FFD700', '#FF6B00']
                      });
                    }} 
                    className="flex-1 bg-[#07C160] text-white py-3 rounded-lg font-bold"
                  >
                    允许
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Video Demo Modal */}
        {showVideoModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6 max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setShowVideoModal(false)} className="absolute top-4 right-4 p-1 text-gray-400 z-20"><X className="w-6 h-6" /></button>
              <h2 className="text-center text-xl font-bold mb-6 text-brand-blue">点签全流程系统演示</h2>
              <div 
                className="aspect-video bg-gray-900 rounded-2xl relative mb-6 overflow-hidden flex items-center justify-center group cursor-pointer shadow-inner"
                onClick={togglePlay}
              >
                <video 
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                  poster="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&h=450&fit=crop"
                >
                  <source src="https://assets.mixkit.co/videos/preview/mixkit-businesswoman-signing-a-contract-4840-large.mp4" type="video/mp4" />
                  您的浏览器不支持 video 标签。
                </video>
                
                <AnimatePresence>
                  {!isPlaying && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center z-10"
                    >
                      <div className="w-20 h-20 bg-brand-blue/90 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm">
                        <Play className="w-10 h-10 text-white fill-white ml-1" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Fullscreen Button */}
                <button 
                  onClick={handleFullscreen}
                  className="absolute bottom-4 right-4 z-30 p-2 bg-black/50 hover:bg-black/70 rounded-lg backdrop-blur-sm transition-colors"
                >
                  <Maximize className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Play className="w-4 h-4 text-brand-blue" />
                  演示视频列表
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { title: '3分钟快速上手演示', duration: '03:15', desc: '全流程带您了解点签核心功能', active: true },
                    { title: '电子合同签署流程', duration: '01:45', desc: '手机端、电脑端签署演示', active: false },
                    { title: '司法存证与审计报告', duration: '02:10', desc: '如何保障合同的法律效力', active: false },
                    { title: '399 终身会员权益解读', duration: '02:30', desc: '深度解析会员专属福利', active: false }
                  ].map((v, i) => (
                    <div key={`${v.title}-${i}`} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${v.active ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-transparent opacity-70'}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm shrink-0 ${v.active ? 'bg-white' : 'bg-gray-100'}`}>
                        <Play className={`w-5 h-5 ${v.active ? 'text-brand-blue' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold text-gray-800">{v.title}</h4>
                          <span className="text-[10px] text-gray-400">{v.duration}</span>
                        </div>
                        <p className="text-[11px] text-gray-500">{v.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => { setShowVideoModal(false); handleSend('我想预约一对一系统演示'); }}
                className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
              >
                预约 1对1 专属演示
              </button>
            </motion.div>
          </div>
        )}

        {/* Industry Cases Modal */}
        {showCaseModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6 max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setShowCaseModal(false)} className="absolute top-4 right-4 p-1 text-gray-400 z-20"><X className="w-6 h-6" /></button>
              <h2 className="text-center text-xl font-bold mb-6 text-indigo-600 flex items-center justify-center gap-2">
                <MessageSquare className="w-6 h-6" />
                行业成功案例
              </h2>

              {/* Search Module */}
              <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="搜索行业、公司、痛点或方案..."
                  value={caseSearchQuery}
                  onChange={(e) => setCaseSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {caseSearchQuery && (
                  <button 
                    onClick={() => setCaseSearchQuery('')}
                    className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Industry Filter */}
              <div className="mb-6">
                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-3 ml-1">快速查找您的行业</div>
                <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar -mx-1 px-1">
                  {['全部', ...new Set(INDUSTRY_CASES.map(c => c.title.replace('行业', '')))].map((industry) => (
                    <button
                      key={industry}
                      onClick={() => setCaseFilter(industry === '全部' ? '全部' : industry + '行业')}
                      className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        (caseFilter === '全部' && industry === '全部') || caseFilter === industry + '行业'
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'
                      }`}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                {(() => {
                  const filtered = INDUSTRY_CASES.filter(c => {
                    const matchesFilter = caseFilter === '全部' || c.title === caseFilter;
                    const matchesSearch = !caseSearchQuery || 
                      c.title.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
                      c.company.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
                      c.painPoint.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
                      c.solution.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
                      c.result.toLowerCase().includes(caseSearchQuery.toLowerCase());
                    return matchesFilter && matchesSearch;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                          <Search className="w-8 h-8" />
                        </div>
                        <p className="text-gray-400 text-sm">未找到相关案例，请尝试其他关键词</p>
                        <button 
                          onClick={() => { setCaseFilter('全部'); setCaseSearchQuery(''); }}
                          className="mt-4 text-indigo-600 text-xs font-bold hover:underline"
                        >
                          重置搜索条件
                        </button>
                      </div>
                    );
                  }

                  return filtered.map((c, i) => (
                    <motion.div 
                      key={`${c.title}-${i}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
                    >
                      <div className="h-40 relative">
                        <img src={c.img} className="w-full h-full object-cover" alt={c.title} referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-3 left-4">
                          <h4 className="text-white font-bold text-lg">{c.title}</h4>
                          <p className="text-white/80 text-xs">{c.company}</p>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex gap-2">
                          <div className="shrink-0 w-5 h-5 bg-red-50 rounded flex items-center justify-center mt-0.5 text-red-500">
                            <ShieldAlert className="w-3 h-3" />
                          </div>
                          <div className="text-[12px] text-gray-600"><span className="font-bold text-gray-800">痛点：</span>{c.painPoint}</div>
                        </div>
                        <div className="flex gap-2">
                          <div className="shrink-0 w-5 h-5 bg-blue-50 rounded flex items-center justify-center mt-0.5 text-blue-500">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                          <div className="text-[12px] text-gray-600"><span className="font-bold text-gray-800">方案：</span>{c.solution}</div>
                        </div>
                        <div className="flex gap-2 bg-green-50 p-2 rounded-xl border border-green-100">
                          <div className="shrink-0 w-5 h-5 bg-green-100 rounded flex items-center justify-center mt-0.5 text-green-600">
                            <Award className="w-3 h-3" />
                          </div>
                          <div className="text-[12px] text-green-800 font-medium"><span className="font-bold">成效：</span>{c.result}</div>
                        </div>
                      </div>
                    </motion.div>
                  ));
                })()}
              </div>

              <button 
                onClick={() => { setShowCaseModal(false); handleSend('我想获取定制化行业方案'); }}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold mt-8 shadow-lg active:scale-95 transition-transform"
              >
                获取定制化方案
              </button>
            </motion.div>
          </div>
        )}

        {/* Smart Contract Manager Modal */}
        {showManagerModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6 max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setShowManagerModal(false)} className="absolute top-4 right-4 p-1 text-gray-400 z-20"><X className="w-6 h-6" /></button>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <ClipboardCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">智能合同管家</h2>
                    <p className="text-xs text-gray-500">AI 自动提取节点，到期实时提醒</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setShowManagerModal(false); handleSend("我想咨询一下关于合同管理和法律合规的问题。"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-transform"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    AI 咨询
                  </button>
                  <button 
                    onClick={() => { setShowManagerModal(false); setShowReviewModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-lg text-xs font-bold shadow-md shadow-brand-blue/20 active:scale-95 transition-transform"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    智能导入
                  </button>
                  <button 
                    onClick={() => {
                      setIsBatchMode(!isBatchMode);
                      setSelectedContractIds([]);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isBatchMode 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                        : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                    }`}
                  >
                    {isBatchMode ? '取消批量' : '批量操作'}
                  </button>
                </div>
              </div>

              {/* AI Smart Overview */}
              <div 
                onClick={() => {
                  setShowManagerModal(false);
                  handleSend("请帮我分析一下目前所有在管合同的整体风险状况，并给出本月的续约建议。");
                }}
                className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden cursor-pointer group active:scale-95 transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold opacity-80 mb-1 flex items-center gap-1">
                      AI 智能概览
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    </div>
                    <div className="text-sm font-bold">本月有 2 份合同需重点关注续约风险</div>
                    <div className="text-[10px] opacity-70 mt-1">点击获取 AI 深度分析报告 & 签署策略建议</div>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
                  <div className="text-lg font-bold text-emerald-700">{managedContracts.filter(c => c.status === 'active').length}</div>
                  <div className="text-[10px] text-emerald-600">履行中</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100 text-center">
                  <div className="text-lg font-bold text-orange-700">{managedContracts.filter(c => c.status === 'expiring').length}</div>
                  <div className="text-[10px] text-orange-600">即将到期</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                  <div className="text-lg font-bold text-gray-700">{managedContracts.filter(c => c.status === 'expired').length}</div>
                  <div className="text-[10px] text-gray-600">已到期</div>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="搜索合同名称或合作方..." 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Contract List */}
              <div className="space-y-4 pb-24 max-h-[600px] overflow-y-auto no-scrollbar pr-1">
                {managedContracts.filter(c => c.status !== 'archived').map((contract) => (
                  <motion.div 
                    key={contract.id}
                    onClick={() => isBatchMode && toggleSelectContract(contract.id)}
                    className={`p-4 rounded-2xl border transition-all relative ${
                      isBatchMode && selectedContractIds.includes(contract.id)
                        ? 'border-emerald-500 bg-emerald-50/30'
                        : contract.status === 'expiring' 
                          ? 'bg-orange-50/30 border-orange-100 shadow-sm' 
                          : 'bg-white border-gray-100'
                    } ${isBatchMode ? 'cursor-pointer' : ''}`}
                  >
                    {isBatchMode && (
                      <div className="absolute top-4 right-4 z-10">
                        {selectedContractIds.includes(contract.id) ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            contract.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            contract.status === 'expiring' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {contract.category}
                          </span>
                          {contract.status === 'expiring' && (
                            <span className="flex items-center gap-1 text-[10px] text-orange-600 font-bold animate-pulse">
                              <AlertCircle className="w-3 h-3" />
                              即将到期
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{contract.title}</h4>
                      </div>
                      {!isBatchMode && (
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 text-[11px] text-gray-500 mb-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        甲方：{contract.partyA}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        乙方：{contract.partyB}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        到期日：{contract.expiryDate}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5" />
                        提醒：{contract.reminders.length > 0 ? `${contract.reminders.join('/')}天前` : '未开启'}
                      </div>
                    </div>

                    {/* Interactive Reminder Settings */}
                    <div className="mb-4 p-2.5 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          <Bell className="w-3 h-3" />
                          自定义续约提醒 (提前天数)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {[7, 15, 30].map(day => (
                          <button
                            key={day}
                            onClick={() => toggleReminder(contract.id, day)}
                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                              contract.reminders.includes(day)
                                ? 'bg-emerald-500 text-white shadow-sm scale-105'
                                : 'bg-white text-gray-400 border border-gray-100 hover:border-emerald-200'
                            }`}
                          >
                            {day}天
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-top border-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-gray-400">AI 已自动提取 4 个关键节点</span>
                      </div>
                      <button 
                        onClick={() => { 
                          setPreviewContract(contract);
                          setShowPreviewModal(true);
                        }}
                        className="text-[11px] font-bold text-brand-blue flex items-center gap-1 hover:underline bg-blue-50 px-2 py-1 rounded-lg"
                      >
                        <Eye className="w-3 h-3" />
                        预览
                      </button>
                      <button 
                        onClick={() => { setShowManagerModal(false); handleSend(`帮我分析合同 ${contract.title} 的续约风险，并给出专业建议。`); }}
                        className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 hover:underline bg-emerald-50 px-2 py-1 rounded-lg"
                      >
                        <Brain className="w-3 h-3" />
                        AI 咨询
                      </button>
                      <button 
                        onClick={() => { 
                          setShowManagerModal(false); 
                          setReviewContent(`这是合同《${contract.title}》的全文内容（模拟）：\n\n甲方：${contract.partyA}\n乙方：${contract.partyB}\n到期日期：${contract.expiryDate}\n\n条款1：本合同自签署之日起生效...\n条款2：违约责任...`);
                          setShowReviewModal(true); 
                        }}
                        className="text-[11px] font-bold text-orange-600 flex items-center gap-1 hover:underline bg-orange-50 px-2 py-1 rounded-lg"
                      >
                        <ShieldAlert className="w-3 h-3" />
                        AI 审查
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Batch Action Bar */}
              <AnimatePresence>
                {isBatchMode && selectedContractIds.length > 0 && (
                  <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 z-50 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-sm">
                        {selectedContractIds.length}
                      </div>
                      <span className="text-xs font-bold text-gray-500">已选择</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={batchAiReview}
                        className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-700 rounded-xl text-xs font-bold hover:bg-orange-100 transition-colors"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        AI 批量审查
                      </button>
                      <button 
                        onClick={batchSend}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        批量发送
                      </button>
                      <button 
                        onClick={() => batchSetReminders([7, 15, 30])}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        批量提醒
                      </button>
                      <button 
                        onClick={batchArchive}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        批量归档
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-8 space-y-3">
                <button 
                  onClick={() => { setShowManagerModal(false); setShowReviewModal(true); }}
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Plus className="w-5 h-5" />
                  添加新合同到管家
                </button>
                <p className="text-center text-[10px] text-gray-400">
                  * 上传合同后，AI 将自动识别有效期并加入管家
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Contract Preview Modal */}
        {showPreviewModal && previewContract && (
          <div className="modal-overlay z-[60]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="modal-content p-0 max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-gradient-to-br from-brand-blue to-indigo-600 text-white relative shrink-0">
                <button 
                  onClick={() => setShowPreviewModal(false)} 
                  className="absolute top-4 right-4 p-1.5 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold leading-tight">{previewContract.title}</h2>
                    <p className="text-xs opacity-80 mt-1">合同编号：CT-{previewContract.id.toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                    {previewContract.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                    previewContract.status === 'active' ? 'bg-emerald-400/30 text-emerald-100' :
                    previewContract.status === 'expiring' ? 'bg-orange-400/30 text-orange-100' :
                    'bg-gray-400/30 text-gray-100'
                  }`}>
                    {previewContract.status === 'active' ? '履行中' : previewContract.status === 'expiring' ? '即将到期' : '已到期'}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <div className="text-[10px] text-gray-400 font-bold mb-1 uppercase">甲方</div>
                    <div className="text-sm font-bold text-gray-800 truncate">{previewContract.partyA}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <div className="text-[10px] text-gray-400 font-bold mb-1 uppercase">乙方</div>
                    <div className="text-sm font-bold text-gray-800 truncate">{previewContract.partyB}</div>
                  </div>
                </div>

                {/* Main Clauses */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-4 bg-brand-blue rounded-full" />
                    <h3 className="text-sm font-bold text-gray-800">主要条款预览</h3>
                  </div>
                  <div className="space-y-2.5">
                    {(previewContract.clauses || [
                      '第一条：合同目的及合作范围',
                      '第二条：费用标准及支付方式',
                      '第三条：双方权利与义务',
                      '第四条：违约责任及争议解决',
                      '第五条：保密协议及其他事项'
                    ]).map((clause: string, idx: number) => (
                      <div key={idx} className="flex gap-3 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="shrink-0 w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center text-brand-blue text-xs font-bold">
                          {idx + 1}
                        </div>
                        <p className="text-[13px] text-gray-600 leading-relaxed">{clause}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expiry Reminder Settings */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                    <h3 className="text-sm font-bold text-gray-800">到期提醒设置</h3>
                  </div>
                  <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-800">提醒状态</div>
                          <div className="text-[10px] text-gray-500">当前：{previewContract.reminderSettings?.status || '已开启'}</div>
                        </div>
                      </div>
                      <div className="w-10 h-5 bg-orange-500 rounded-full relative">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">提醒时间</div>
                        <div className="flex gap-1 flex-wrap">
                          {(previewContract.reminderSettings?.advanceDays || [7, 30]).map((day: number) => (
                            <span key={day} className="px-2 py-0.5 bg-white border border-orange-200 rounded-lg text-[10px] font-bold text-orange-700">
                              提前 {day} 天
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">通知方式</div>
                        <div className="text-xs font-bold text-gray-700">{previewContract.reminderSettings?.method || '短信+邮件'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 shrink-0">
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 active:scale-95 transition-transform"
                >
                  关闭
                </button>
                <button 
                  onClick={() => {
                    setShowPreviewModal(false);
                    setShowManagerModal(false);
                    handleSend(`我想修改合同《${previewContract.title}》的到期提醒设置。`);
                  }}
                  className="flex-1 py-3 bg-brand-blue text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Settings2 className="w-4 h-4" />
                  修改设置
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6"
            >
              <button 
                onClick={() => { setShowFeedbackModal(false); setIsFeedbackSubmitted(false); }} 
                className="absolute top-4 right-4 p-1 text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
              
              {!isFeedbackSubmitted ? (
                <>
                  <h2 className="text-center text-xl font-bold mb-6 text-brand-blue">意见反馈</h2>
                  <p className="text-gray-500 text-sm mb-4">您的建议是我们前进的动力，请留下您的宝贵意见：</p>
                  <textarea 
                    className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-blue transition-colors text-[15px] resize-none"
                    placeholder="请输入您的反馈内容..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                  />
                  <button 
                    onClick={() => setIsFeedbackSubmitted(true)}
                    disabled={!feedbackText.trim()}
                    className={`w-full py-4 rounded-xl font-bold mt-6 shadow-lg transition-all ${
                      feedbackText.trim() ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    提交反馈
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">提交成功</h3>
                  <p className="text-gray-500 text-sm mb-8">感谢您的宝贵意见！</p>
                  <button 
                    onClick={() => { setShowFeedbackModal(false); setIsFeedbackSubmitted(false); setFeedbackText(''); }} 
                    className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold"
                  >
                    返回
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Template Library Modal */}
        {showTemplateModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-[32px] w-full max-w-md absolute bottom-0 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {isDrafting && (
                    <button 
                      onClick={() => setIsDrafting(false)}
                      className="p-1.5 bg-gray-100 rounded-lg text-gray-500 mr-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <h2 className="text-xl font-bold text-gray-800">
                    {isDrafting ? '智能草拟向导' : '合同模板库'}
                  </h2>
                </div>
                <button 
                  onClick={() => {
                    setShowTemplateModal(false);
                    setIsDrafting(false);
                    setSelectedTemplate(null);
                    setDraftingFields({});
                  }} 
                  className="p-2 bg-gray-100 rounded-full text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!isDrafting ? (
                <>
                  <div className="px-6 py-3 border-b border-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="搜索模板名称或关键词..." 
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-blue transition-colors"
                        value={templateSearchQuery}
                        onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      />
                      {templateSearchQuery && (
                        <button 
                          onClick={() => setTemplateSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-10">
                    {/* Membership Upsell in Template List */}
                    <div 
                      onClick={() => setShowMembershipModal(true)}
                      className="bg-gradient-to-r from-brand-gold/20 to-brand-gold/5 border border-brand-gold/30 p-4 rounded-2xl flex items-center justify-between cursor-pointer group relative overflow-hidden"
                    >
                      <div className="absolute -top-1 -right-4 bg-brand-gold text-brand-gold-text text-[9px] px-6 py-1 font-bold rotate-45 shadow-sm">尊享</div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Crown className="w-6 h-6 text-brand-gold-text" />
                        </div>
                        <div>
                          <div className="text-[14px] font-bold text-brand-gold-text flex items-center gap-1">
                            解锁全部 1000+ 行业模板
                            <Sparkles className="w-3 h-3" />
                          </div>
                          <div className="text-[11px] text-brand-gold-text/70">399 终身会员尊享无限下载</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-brand-gold-text group-hover:translate-x-1 transition-transform" />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-2">
                      <p className="text-brand-blue text-sm leading-relaxed">
                        💡 <b>小贴士：</b> 选择模板后，我会引导您填写必要信息，确保合同严谨合规。
                      </p>
                    </div>

                    {templates.filter(t => 
                      t.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) || 
                      t.description.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                      t.category.toLowerCase().includes(templateSearchQuery.toLowerCase())
                    ).length > 0 ? (
                      templates.filter(t => 
                        t.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) || 
                        t.description.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                        t.category.toLowerCase().includes(templateSearchQuery.toLowerCase())
                      ).map((template) => (
                        <div key={template.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-brand-blue transition-colors group">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {template.category}
                            </span>
                            <button className="text-gray-300 group-hover:text-brand-blue transition-colors">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <h3 className="font-bold text-[16px] mb-1 text-gray-800">{template.title}</h3>
                          <p className="text-gray-500 text-[13px] mb-4 line-clamp-2">{template.description}</p>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => {
                                setSelectedTemplate(template);
                                setIsDrafting(true);
                                setDraftingFields({});
                              }}
                              className="flex-1 bg-brand-blue text-white py-2.5 rounded-xl text-[14px] font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                              <FileEdit className="w-4 h-4" />
                              开始草拟
                            </button>
                            <button className="px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] text-gray-600 font-medium active:bg-gray-50">
                              预览
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <Search className="w-8 h-8 text-gray-200" />
                        </div>
                        <h3 className="text-gray-800 font-bold mb-1">未找到相关模板</h3>
                        <p className="text-gray-400 text-sm">尝试更换关键词搜索</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-6 h-6 text-brand-blue" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{selectedTemplate?.title}</h3>
                      <p className="text-xs text-gray-400">请完成以下信息检查清单</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedTemplate?.requiredFields.map((field: any) => (
                      <div key={field.key} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            {field.label}
                            {draftingFields[field.key] && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            )}
                          </label>
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">必填</span>
                        </div>
                        <input 
                          type="text"
                          placeholder={field.placeholder}
                          className={`w-full bg-gray-50 border rounded-xl py-3 px-4 text-sm outline-none transition-all ${
                            draftingFields[field.key] ? 'border-green-100 focus:border-green-500' : 'border-gray-100 focus:border-brand-blue'
                          }`}
                          value={draftingFields[field.key] || ''}
                          onChange={(e) => setDraftingFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-brand-blue" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-700 text-[13px] font-medium leading-relaxed">
                          填写完成后，AI 将根据您提供的信息自动生成一份专业的合同草案。
                        </p>
                        <div className="flex items-center gap-1.5 bg-brand-gold/30 px-2 py-1 rounded-lg w-fit border border-brand-gold/50">
                          <Crown className="w-3.5 h-3.5 text-brand-gold-text" />
                          <span className="text-brand-gold-text text-[11px] font-bold">会员用户可享有一键发起签署功能</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={() => {
                        const allFilled = selectedTemplate.requiredFields.every((f: any) => draftingFields[f.key]);
                        if (allFilled) {
                          setShowTemplateModal(false);
                          setIsDrafting(false);
                          const fieldSummary = selectedTemplate.requiredFields
                            .map((f: any) => `${f.label}：${draftingFields[f.key]}`)
                            .join('，');
                          handleSend(`我想根据《${selectedTemplate.title}》模板草拟一份合同。关键信息如下：${fieldSummary}。请帮我生成一份正式的合同草案。`);
                          setSelectedTemplate(null);
                          setDraftingFields({});
                        }
                      }}
                      disabled={!selectedTemplate?.requiredFields.every((f: any) => draftingFields[f.key])}
                      className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                        selectedTemplate?.requiredFields.every((f: any) => draftingFields[f.key]) 
                          ? 'bg-brand-blue text-white' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      生成合同草案
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <p className="text-center text-[11px] text-gray-400 mt-3">
                      已完成 {Object.keys(draftingFields).filter(k => draftingFields[k]).length} / {selectedTemplate?.requiredFields.length} 项
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Contract Review Modal */}
        {showReviewModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-[32px] w-full max-w-md absolute bottom-0 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">智能合同审查</h2>
                </div>
                <button onClick={() => setShowReviewModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-10">
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-800">审查方式</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => { setReviewContent(''); setUploadedFile(null); }}
                      className={`border p-4 rounded-2xl flex flex-col items-center gap-2 text-center cursor-pointer transition-colors ${!uploadedFile ? 'bg-blue-50 border-brand-blue' : 'border-gray-100 hover:bg-gray-50'}`}
                    >
                      <FileText className={`w-6 h-6 ${!uploadedFile ? 'text-brand-blue' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${!uploadedFile ? 'text-brand-blue' : 'text-gray-600'}`}>粘贴文本</span>
                    </div>
                    <div 
                      onClick={() => reviewFileInputRef.current?.click()}
                      className={`border p-4 rounded-2xl flex flex-col items-center gap-2 text-center cursor-pointer transition-colors ${uploadedFile ? 'bg-blue-50 border-brand-blue' : 'border-gray-100 hover:bg-gray-50'}`}
                    >
                      <Upload className={`w-6 h-6 ${uploadedFile ? 'text-brand-blue' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${uploadedFile ? 'text-brand-blue' : 'text-gray-600'}`}>
                        {uploadedFile ? '更换文件' : '上传文件'}
                      </span>
                    </div>
                    <input 
                      type="file" 
                      ref={reviewFileInputRef} 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, true)}
                      accept="image/*,.txt,.md,.pdf,.docx"
                    />
                  </div>
                  {uploadedFile && (
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                          {uploadedFile.type.includes('image') ? <ImageIcon className="w-4 h-4 text-brand-blue" /> : <FileText className="w-4 h-4 text-brand-blue" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-gray-800 truncate">{uploadedFile.name}</div>
                          <div className="text-[10px] text-gray-400 uppercase">{uploadedFile.type.split('/')[1] || 'FILE'}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setUploadedFile(null); setReviewContent(''); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">合同内容</h3>
                    {reviewContent && (
                      <button 
                        onClick={() => exportToPDF('review-textarea-content', 'contract-review.pdf')}
                        className="text-[12px] text-brand-blue flex items-center gap-1 font-medium"
                      >
                        <Download className="w-3 h-3" />
                        导出预览
                      </button>
                    )}
                  </div>
                  <div id="review-textarea-content" className="hidden">
                    <div className="p-10 text-gray-800 whitespace-pre-wrap font-serif leading-relaxed">
                      {reviewContent}
                    </div>
                  </div>
                  
                  {reviewAnalysis && reviewAnalysis.risks && reviewAnalysis.risks.length > 0 ? (
                    <div className="w-full min-h-[128px] p-4 bg-white border border-gray-200 rounded-2xl text-[14px] leading-relaxed font-serif overflow-y-auto max-h-64 shadow-inner">
                      {renderHighlightedText(reviewContent, reviewAnalysis.risks)}
                    </div>
                  ) : (
                    <textarea 
                      className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-brand-blue transition-colors text-[14px] resize-none"
                      placeholder="请在此粘贴您需要审查的合同条款或全文..."
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                    />
                  )}
                </div>

                {/* AI Risk Analysis Section */}
                {(isReviewing || reviewAnalysis) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="w-5 h-5" />
                        <h3 className="font-bold">AI 风险分析与建议</h3>
                      </div>
                      {reviewAnalysis?.risks?.length > 0 && (
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                          发现 {reviewAnalysis.risks.length} 处风险
                        </span>
                      )}
                    </div>
                    
                    <div className={`bg-orange-50/50 border border-orange-100 rounded-2xl p-4 min-h-[100px] relative ${!isMember && reviewAnalysis ? 'max-h-[320px] overflow-hidden' : ''}`}>
                      {isReviewing ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                          <p className="text-sm text-orange-600 font-medium">正在深度分析合同风险...</p>
                        </div>
                      ) : (
                        <>
                        <div className="space-y-4">
                          <div className="bg-white/80 border border-orange-100 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                              <span className="text-[12px] font-bold text-orange-600 uppercase tracking-wider">专家审查综述</span>
                            </div>
                            <p className="text-[14px] text-gray-800 font-medium leading-relaxed italic">
                              “{reviewAnalysis.summary}”
                            </p>
                          </div>
                          
                          <div className="space-y-3">
                            {reviewAnalysis.risks.map((risk: any, idx: number) => {
                              const SeverityIcon = 
                                risk.severity === 'high' ? AlertOctagon :
                                risk.severity === 'medium' ? AlertTriangle :
                                AlertCircle;
                              
                              const severityBg = 
                                risk.severity === 'high' ? 'bg-red-50' :
                                risk.severity === 'medium' ? 'bg-orange-50' :
                                'bg-yellow-50';
                              
                              const severityText = 
                                risk.severity === 'high' ? 'text-red-700' :
                                risk.severity === 'medium' ? 'text-orange-700' :
                                'text-yellow-700';

                              return (
                                <div key={`risk-item-${idx}`} className={`${severityBg} rounded-xl p-3 border border-white/50 shadow-sm`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <SeverityIcon className={`w-4 h-4 ${severityText}`} />
                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${severityText}`}>
                                      {risk.severity === 'high' ? '高风险' : risk.severity === 'medium' ? '中风险' : '低风险'}
                                    </span>
                                  </div>
                                  <div className="text-[13px] font-bold text-gray-800 mb-1">“{risk.phrase}”</div>
                                  <div className="text-[12px] text-gray-600 leading-relaxed">
                                    <span className="font-bold text-gray-700">建议：</span>{risk.suggestion}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {!isMember && (
                          <div className="absolute inset-x-0 bottom-0 h-[180px] bg-gradient-to-t from-white via-white/95 to-transparent backdrop-blur-[8px] flex flex-col items-center justify-end pb-6 z-10">
                            <motion.div   
                              initial={{ y: 30, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              className="bg-white/95 border border-brand-gold/30 p-5 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-[85%]"
                            >
                              <div className="w-12 h-12 bg-brand-gold/20 rounded-full flex items-center justify-center">
                                <Crown className="w-6 h-6 text-brand-gold-text" />
                              </div>
                              <div className="space-y-1.5">
                                <div className="text-sm font-bold text-gray-800">深度风险分析已隐藏</div>
                                <div className="text-[11px] text-gray-500 leading-relaxed">开通 399 终身会员即可解锁完整审查报告与专业修改建议</div>
                              </div>
                              <button 
                                onClick={() => setShowMembershipModal(true)}
                                className="w-full bg-brand-gold text-brand-gold-text py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-gold/20 active:scale-95 transition-transform"
                              >
                                立即解锁完整版
                              </button>
                            </motion.div>
                          </div>
                        )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {reviewAnalysis && (
                  <div 
                    onClick={() => setShowMembershipModal(true)}
                    className="bg-brand-blue/5 border border-brand-blue/10 p-4 rounded-2xl flex items-center gap-4 cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-brand-blue text-white text-[9px] px-2 py-0.5 font-bold rounded-bl-lg">会员尊享</div>
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                      <Scale className="w-6 h-6 text-brand-blue" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-bold text-gray-800 flex items-center gap-1">
                        专业律师人工复核
                        <Sparkles className="w-3 h-3 text-brand-blue" />
                      </div>
                      <div className="text-[11px] text-gray-500">399 会员赠送一年法务在线咨询</div>
                    </div>
                    <div className="bg-brand-blue text-white px-3 py-1 rounded-lg text-[11px] font-bold">了解</div>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-gray-500 text-[12px] leading-relaxed">
                    ⚠️ <b>免责声明：</b> AI 审查结果仅供参考，不构成正式的法律意见。对于重大合同，建议咨询专业律师。
                  </p>
                </div>

                <div className="flex gap-3">
                  {reviewAnalysis ? (
                    <button 
                      onClick={() => {
                        setReviewAnalysis('');
                        setReviewContent('');
                        setUploadedFile(null);
                      }}
                      className="flex-1 py-4 border border-gray-200 rounded-2xl font-bold text-gray-600 active:bg-gray-50"
                    >
                      清空重置
                    </button>
                  ) : null}
                  <button 
                    onClick={handleReviewAnalysis}
                    disabled={(!reviewContent.trim() && !uploadedFile) || isReviewing || isUploading}
                    className={`flex-[2] py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                      (reviewContent.trim() || uploadedFile) && !isReviewing && !isUploading ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isReviewing || isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ShieldAlert className="w-5 h-5" />
                    )}
                    {isReviewing ? '正在分析...' : isUploading ? '正在上传...' : reviewAnalysis ? '重新分析' : '开始智能审查'}
                  </button>
                </div>
                
                {reviewAnalysis && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        const newContract = {
                          id: generateId(),
                          title: uploadedFile?.name || `AI 审查合同 - ${new Date().toLocaleDateString()}`,
                          partyA: userProfile.name || '本人',
                          partyB: '待确认',
                          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          status: 'active',
                          category: 'AI 审查',
                          reminders: [30]
                        };
                        setManagedContracts(prev => [newContract, ...prev]);
                        setShowReviewModal(false);
                        setReviewAnalysis(null);
                        setReviewContent('');
                        setUploadedFile(null);
                        
                        setMessages(prev => [...prev, {
                          id: generateId(),
                          role: 'ai',
                          content: `✅ 已将合同《${newContract.title}》保存至“合同管家”。系统已根据 AI 审查结果自动设置了 30 天到期提醒。`,
                          type: 'text'
                        }]);
                        
                        confetti({
                          particleCount: 150,
                          spread: 100,
                          origin: { y: 0.6 }
                        });
                      }}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      <Save className="w-5 h-5" />
                      保存至合同管家
                    </button>
                    <button 
                      onClick={() => {
                        if (!isMember) {
                          setShowMembershipModal(true);
                        } else {
                          setShowReviewModal(false);
                          handleSend("我已经在审查工具中完成了初步分析，请针对以上风险点给出更详细的法律规避方案。");
                        }
                      }}
                      className="flex-1 py-4 bg-brand-blue text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      <MessageSquare className="w-5 h-5" />
                      咨询 AI 方案
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* User Profile Modal */}
        {showProfileModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6 max-w-sm max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 p-1 text-gray-400"><X className="w-6 h-6" /></button>
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-3 shadow-inner">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User Avatar" referrerPolicy="no-referrer" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">完善用户画像</h2>
                <p className="text-xs text-gray-400 mt-1">完善资料，获得更精准的 AI 法律建议</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium ml-1">姓名</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-brand-blue transition-colors"
                      placeholder="姓名"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium ml-1">联系电话</label>
                    <input 
                      type="text" 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-brand-blue transition-colors"
                      placeholder="电话"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium ml-1">所属行业</label>
                    <select 
                      value={editIndustry}
                      onChange={(e) => setEditIndustry(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-brand-blue transition-colors appearance-none"
                    >
                      <option value="物流运输">物流运输</option>
                      <option value="医疗健康">医疗健康</option>
                      <option value="人力资源">人力资源</option>
                      <option value="教育培训">教育培训</option>
                      <option value="金融保险">金融保险</option>
                      <option value="IT/互联网">IT/互联网</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium ml-1">您的职位</label>
                    <input 
                      type="text" 
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-brand-blue transition-colors"
                      placeholder="职位"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium ml-1">公司规模</label>
                  <select 
                    value={editCompanySize}
                    onChange={(e) => setEditCompanySize(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-brand-blue transition-colors appearance-none"
                  >
                    <option value="1-10人">1-10人 (初创)</option>
                    <option value="10-50人">10-50人 (小微)</option>
                    <option value="50-200人">50-200人 (中型)</option>
                    <option value="200人以上">200人以上 (大型)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium ml-1">月均合同量</label>
                  <select 
                    value={editMonthlyVolume}
                    onChange={(e) => setEditMonthlyVolume(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-brand-blue transition-colors appearance-none"
                  >
                    <option value="10份以下">10份以下</option>
                    <option value="10-50份">10-50份</option>
                    <option value="50-100份">50-100份</option>
                    <option value="100份以上">100份以上</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium ml-1">主要使用场景</label>
                  <input 
                    type="text" 
                    value={editMainScenario}
                    onChange={(e) => setEditMainScenario(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-brand-blue transition-colors"
                    placeholder="如：销售合同、劳动合同、保密协议"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 active:bg-gray-50"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    setUserProfile({ 
                      name: editName, 
                      phone: editPhone,
                      industry: editIndustry,
                      role: editRole,
                      companySize: editCompanySize,
                      monthlyVolume: editMonthlyVolume,
                      mainScenario: editMainScenario
                    });
                    setShowProfileModal(false);
                  }}
                  className="flex-1 py-3 bg-brand-blue text-white rounded-xl font-bold shadow-md active:scale-95 transition-transform"
                >
                  保存画像
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Clear Chat Confirmation Modal */}
        {showClearConfirmModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6"
            >
              <h2 className="text-center text-xl font-bold mb-4 text-gray-800">确认清空记录？</h2>
              <p className="text-gray-500 text-sm text-center mb-8">清空后，当前的聊天历史将无法恢复，是否继续？</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowClearConfirmModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    setMessages(INITIAL_MESSAGES);
                    setCurrentLevel(1);
                    setShowClearConfirmModal(false);
                  }}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold shadow-lg"
                >
                  确认清空
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* About DianQian Modal */}
        {showAboutModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6 max-w-sm"
            >
              <button onClick={() => setShowAboutModal(false)} className="absolute top-4 right-4 p-1 text-gray-400"><X className="w-6 h-6" /></button>
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <span className="text-white text-2xl font-bold">点签</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800">关于点签</h2>
                <p className="text-xs text-gray-400 mt-1">领先的数字化合同管理平台</p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <h3 className="font-bold text-gray-800 text-sm mb-2">平台简介</h3>
                  <p className="text-gray-600 text-[13px] leading-relaxed">
                    点签是一款专为中小微企业及个人创客打造的数字化合同签署与管理平台。我们致力于通过 AI 技术与电子签名技术，让合同签署更简单、更合规、更高效。
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-xl text-center">
                    <div className="text-brand-blue font-bold text-lg">100%</div>
                    <div className="text-[11px] text-gray-500">法律合规</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl text-center">
                    <div className="text-brand-blue font-bold text-lg">0</div>
                    <div className="text-[11px] text-gray-500">纸张浪费</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[13px] text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>CA 机构权威认证</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>全流程存证审计</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>AI 智能合同审查</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowAboutModal(false)}
                className="w-full bg-brand-blue text-white py-3.5 rounded-xl font-bold mt-8 shadow-lg active:scale-95 transition-transform"
              >
                了解更多
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
