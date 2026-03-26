import { useState, useRef, useEffect, MouseEvent, ChangeEvent } from 'react';
import { 
  ChevronLeft, 
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
  Volume2
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
      category: '运输服务'
    },
    { 
      id: 'c2', 
      title: '核心技术开发外包合同', 
      partyA: '点签科技有限公司', 
      partyB: '某某软件工作室', 
      expiryDate: '2024-04-15', 
      status: 'expiring',
      reminders: [3, 7, 15],
      category: '技术开发'
    },
    { 
      id: 'c3', 
      title: '办公室租赁合同 - 2023', 
      partyA: '物业管理公司', 
      partyB: '点签科技有限公司', 
      expiryDate: '2023-10-01', 
      status: 'expired',
      reminders: [],
      category: '房屋租赁'
    }
  ]);

  const [selectedContractIds, setSelectedContractIds] = useState<string[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [dailyTip, setDailyTip] = useState<{ content: string; date: string } | null>(null);
  const [isTipLoading, setIsTipLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
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
    { id: 't1', title: '每日签到', points: 5, icon: 'Calendar', completed: false, description: '每日登录即可领取' },
    { id: 't2', title: '分享至朋友圈', points: 20, icon: 'Share2', completed: false, description: '提升平台曝光量' },
    { id: 't3', title: '邀请好友注册', points: 50, icon: 'UserPlus', completed: false, description: '每邀请一位奖励50积分' },
    { id: 't4', title: '完善个人信息', points: 10, icon: 'UserCheck', completed: true, description: '让点点更懂您的需求' },
    { id: 't5', title: '阅读每日锦囊', points: 2, icon: 'Sparkles', completed: false, description: '学习法律小知识' },
  ]);

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

  const fetchDailyTip = async () => {
    setIsTipLoading(true);
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "请生成一条简短的、30秒内能读完的‘每日法律锦囊’。主题应围绕电子合同、劳动法、商业合同避坑指南或法律合规。语言要通俗易懂，具有实用性。格式要求：直接输出内容，不要包含标题或引言。",
        config: {
          systemInstruction: "你是一个专业的法律顾问，擅长用通俗易懂的语言解释复杂的法律问题。",
          temperature: 0.8,
        }
      });
      
      if (response.text) {
        setDailyTip({
          content: response.text,
          date: new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
        });
      }
    } catch (error) {
      console.error("Failed to fetch daily tip:", error);
      // Fallback tip
      setDailyTip({
        content: "签署电子合同时，请务必确认平台是否具备可靠的身份认证和时间戳服务，以确保合同的法律效力。",
        date: new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
      });
    } finally {
      setIsTipLoading(false);
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
                  key={`risk-${risk.phrase}-${keyCounter++}`}
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
    fetchDailyTip();
  }, []);

  const TaskIcon = ({ name, className }: { name: string, className?: string }) => {
    const icons: Record<string, any> = {
      Calendar,
      Share2: Send,
      UserPlus: Plus,
      UserCheck: CheckCircle2,
      Sparkles,
      Gift: Award,
      Coins: CircleDollarSign
    };
    const Icon = icons[name] || Info;
    return <Icon className={className} />;
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

      if (text.includes('行业成功案例')) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'ai',
            content: '好的，请选择您感兴趣的行业：',
            type: 'options',
            options: ['物流运输', '医疗健康', '人力资源']
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
              description: '通过点签电子合同平台，该物流平台实现了全流程数字化签署，缩短了合同周期，显著降低了法务审核与管理成本，提升了整体运营效率。'
            }
          }]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      // Default AI response
      const isReviewRequest = text.includes('审查') || text.includes('风险分析') || (fileData && fileData.type.startsWith('image'));
      const userContext = `当前用户信息：姓名 ${userProfile.name}，行业 ${userProfile.industry}，职位 ${userProfile.role}，公司规模 ${userProfile.companySize}，月均合同量 ${userProfile.monthlyVolume}，主要使用场景 ${userProfile.mainScenario}。`;
      
      const systemInstruction = isReviewRequest 
        ? `你是一位资深的法律合规专家。${userContext} 请结合用户的行业背景和使用场景，对用户提供的合同内容（可能是文本或图片）进行深度审查，识别潜在的法律风险（如条款模糊、责任不对等、核心条款缺失等），并给出专业的修改建议。请使用清晰的列表格式回答，并保持专业严谨的语气。回答最后请根据当前对话生成3个简短的后续问题建议，格式为：[SUGGESTIONS]: 问题1, 问题2, 问题3`
        : `你是点签平台的智能顾问。${userContext} 请根据用户的行业和职位背景，提供更有针对性的建议。你擅长解答电子合同、法律合规、会员权益（特别是399终身会员）等问题。回答要简洁明了，适合手机端阅读。回答最后请根据当前对话生成3个简短的后续问题建议，格式为：[SUGGESTIONS]: 问题1, 问题2, 问题3`;

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

      const result = await genAI.models.generateContent({
        model,
        contents: [{ role: 'user', parts: parts }],
        config: {
          systemInstruction: systemInstruction,
          tools: [{ googleSearch: {} }]
        }
      });

      const fullContent = result.text || "抱歉，我暂时无法回答这个问题。";
      let displayContent = fullContent;
      let finalSuggestions = suggestions;

      if (fullContent.includes("[SUGGESTIONS]:")) {
        const splitParts = fullContent.split("[SUGGESTIONS]:");
        displayContent = splitParts[0].trim();
        const aiSuggestions = splitParts[1].split(",").map(s => s.trim()).filter(s => s.length > 0);
        if (aiSuggestions.length > 0) {
          finalSuggestions = aiSuggestions;
        }
      }

      const aiMsg: Message = { 
        id: generateId(), 
        role: 'ai', 
        content: displayContent,
        suggestions: finalSuggestions
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Error:", error);
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
      - contractText: 如果输入是图片，请提供提取出的完整合同文本。如果是纯文本输入，此字段可为空。
      - summary: 合同整体风险概览（简短）
      - risks: 风险项列表，每个风险项包含：
        - phrase: 合同中存在风险的具体短语或句子（必须与原合同内容完全一致，以便进行高亮显示）
        - severity: 风险等级（'high', 'medium', 'low'）
        - suggestion: 修改建议
        - reason: 风险原因
      `;
      
      const model = "gemini-3-flash-preview";
      const parts: any[] = [{ text: reviewContent || "请分析这张合同图片中的内容并给出法律建议。" }];
      
      if (uploadedFile && uploadedFile.type.startsWith('image')) {
        parts.push({
          inlineData: {
            data: uploadedFile.data,
            mimeType: uploadedFile.type
          }
        });
      }

      const response = await genAI.models.generateContent({
        model,
        contents: [{ role: 'user', parts: parts }],
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
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
    } catch (error) {
      console.error("Review Analysis Error:", error);
      setReviewAnalysis({ summary: "分析过程中出现错误，请检查网络或重试。", risks: [] });
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
        {/* Daily Tip Card */}
        <AnimatePresence>
          {dailyTip && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 relative"
            >
              <div className="bg-gradient-to-br from-brand-blue/5 to-indigo-50 border border-brand-blue/10 rounded-3xl p-5 shadow-sm overflow-hidden relative group">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-brand-blue/5 rounded-full blur-2xl group-hover:bg-brand-blue/10 transition-colors" />
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-brand-blue">每日法律锦囊</span>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 bg-white px-2 py-1 rounded-full border border-gray-100">{dailyTip.date}</span>
                </div>
                
                <div className="text-[13px] text-gray-600 leading-relaxed relative z-10">
                  {isTipLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-brand-blue" />
                      <span className="text-gray-400">正在为您生成今日锦囊...</span>
                    </div>
                  ) : (
                    dailyTip.content
                  )}
                </div>

                {!isTipLoading && (
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={fetchDailyTip}
                      className="text-[10px] font-bold text-brand-blue/60 hover:text-brand-blue flex items-center gap-1 transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      换一条
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
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
                      <div className="markdown-body" id={`msg-${msg.id}`}>
                        <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
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

              {/* Special Message Types */}
              {msg.type === 'membership' && (
                <div className="bg-brand-gold border border-[#F0D0A0] rounded-2xl p-4 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-6 bg-black/5 flex items-center px-3 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={signupIndex}
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
                <div className="mt-2 space-y-2">
                  <div className="text-[11px] text-gray-400 font-medium ml-1">您可能还想了解：</div>
                  <div className="flex flex-wrap gap-2">
                    {msg.suggestions.map((suggestion, idx) => (
                      <button 
                        key={`suggestion-${msg.id}-${idx}`}
                        onClick={() => handleSend(suggestion)}
                        className="bg-white border border-blue-100 rounded-full px-3 py-1.5 text-[12px] text-brand-blue shadow-sm active:bg-blue-50 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
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
        {isTyping && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center overflow-hidden shrink-0 shadow-md border-2 border-white">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=DianDian&backgroundColor=007AFF" alt="AI Avatar" referrerPolicy="no-referrer" />
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[80%]">
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
                <div className="h-3 bg-gray-100 rounded-full w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded-full w-full animate-pulse" />
                <div className="h-3 bg-gray-100 rounded-full w-1/2 animate-pulse" />
              </div>
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
          <motion.button 
            onClick={() => setShowMembershipModal(true)} 
            className="whitespace-nowrap bg-brand-gold text-brand-gold-text px-3 py-1.5 rounded-lg text-[13px] font-bold flex items-center gap-1 border border-[#F0D0A0] active:scale-95 transition-transform"
            animate={{ 
              boxShadow: ["0 0 0px rgba(240,208,160,0)", "0 0 10px rgba(240,208,160,0.5)", "0 0 0px rgba(240,208,160,0)"]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Crown className="w-3.5 h-3.5" />
            399终身会员
          </motion.button>
          <button onClick={() => setShowCaseModal(true)} className="whitespace-nowrap bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1 active:scale-95 transition-transform">
            <MessageSquare className="w-3.5 h-3.5" />
            行业案例
          </button>
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
                <button onClick={() => setShowTaskModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-400">
                  <X className="w-5 h-5" />
                </button>
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
                  <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-1 h-4 bg-orange-500 rounded-full" />
                    赚积分任务
                  </h3>
                  <div className="space-y-3">
                    {tasks.map(task => (
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
                onClick={() => { setShowMembershipModal(false); setShowAuthModal(true); }}
                className="w-full bg-[#FF6B00] text-white py-4 rounded-xl font-bold mt-10 shadow-lg active:scale-95 transition-transform"
              >
                立即授权微信，解锁以上全部权益
              </button>
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
                  <button onClick={() => setShowAuthModal(false)} className="flex-1 bg-[#07C160] text-white py-3 rounded-lg font-bold">允许</button>
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
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${v.active ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-transparent opacity-70'}`}>
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
              
              <div className="space-y-6">
                {[
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
                    img: 'https://images.unsplash.com/photo-1505751172107-573225a91200?w=800&h=450&fit=crop',
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
                  }
                ].map((c, i) => (
                  <motion.div 
                    key={i}
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
                ))}
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
              <div className="space-y-4 pb-24">
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
                        onClick={() => { setShowManagerModal(false); handleSend(`帮我分析合同 ${contract.title} 的续约风险`); }}
                        className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                      >
                        续约分析
                        <ArrowRight className="w-3 h-3" />
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
                    <div className="border border-gray-100 p-4 rounded-2xl flex flex-col items-center gap-2 text-center hover:bg-gray-50 cursor-pointer transition-colors">
                      <FileText className="w-6 h-6 text-brand-blue" />
                      <span className="text-sm font-medium text-gray-600">粘贴文本</span>
                    </div>
                    <div 
                      onClick={() => reviewFileInputRef.current?.click()}
                      className="border border-gray-100 p-4 rounded-2xl flex flex-col items-center gap-2 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <Upload className="w-6 h-6 text-brand-blue" />
                      <span className="text-sm font-medium text-gray-600">上传文件</span>
                    </div>
                    <input 
                      type="file" 
                      ref={reviewFileInputRef} 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, true)}
                      accept="image/*,.txt,.md,.pdf,.docx"
                    />
                  </div>
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
                    
                    <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 min-h-[100px] relative">
                      {isReviewing ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                          <p className="text-sm text-orange-600 font-medium">正在深度分析合同风险...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-700 font-medium border-b border-orange-100 pb-2">
                            {reviewAnalysis.summary}
                          </p>
                          
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
                  <button 
                    onClick={() => {
                      setShowReviewModal(false);
                      handleSend("我已经在审查工具中完成了初步分析，请针对以上风险点给出更详细的法律规避方案。");
                    }}
                    className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-5 h-5" />
                    咨询 AI 详细方案
                  </button>
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
