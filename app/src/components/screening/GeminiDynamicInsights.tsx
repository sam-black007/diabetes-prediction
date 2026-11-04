'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  HelpCircle,
  Key,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Stethoscope,
  Trash2,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import {
  generateGeminiClinicalSynthesis,
  askGeminiQuestion,
  getGeminiApiKey,
  setGeminiApiKey,
  removeGeminiApiKey,
  testGeminiApiKey,
  type GeminiClinicalSynthesis,
  type GeminiMessage,
} from '@/lib/gemini';
import type { ScreeningResult } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface GeminiDynamicInsightsProps {
  result: ScreeningResult;
}

export function GeminiDynamicInsights({ result }: GeminiDynamicInsightsProps) {
  const [synthesis, setSynthesis] = useState<GeminiClinicalSynthesis | null>(null);
  const [loadingSynthesis, setLoadingSynthesis] = useState(true);
  
  // API Key management modal state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [testingKey, setTestingKey] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<GeminiMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  useEffect(() => {
    const key = getGeminiApiKey();
    setCurrentKey(key);
    if (key) setApiKeyInput(key);

    loadSynthesis(key || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  async function loadSynthesis(keyToUse?: string) {
    setLoadingSynthesis(true);
    try {
      const data = await generateGeminiClinicalSynthesis(result, keyToUse);
      setSynthesis(data);
    } catch {
      toast({ variant: 'destructive', title: 'Could not generate AI synthesis' });
    } finally {
      setLoadingSynthesis(false);
    }
  }

  async function handleSaveKey() {
    if (!apiKeyInput.trim()) {
      removeGeminiApiKey();
      setCurrentKey(null);
      toast({ title: 'Gemini API key removed' });
      setShowKeyModal(false);
      loadSynthesis(undefined);
      return;
    }

    setTestingKey(true);
    const test = await testGeminiApiKey(apiKeyInput.trim());
    setTestingKey(false);

    if (test.ok) {
      setGeminiApiKey(apiKeyInput.trim());
      setCurrentKey(apiKeyInput.trim());
      toast({
        title: 'Gemini API connected!',
        description: `Connected to ${test.model || 'Gemini 3.5 Flash'}. Refreshing clinical insights...`,
      });
      setShowKeyModal(false);
      loadSynthesis(apiKeyInput.trim());
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid Gemini API key',
        description: test.error || 'Please verify your API key from Google AI Studio.',
      });
    }
  }

  async function handleSendMessage(promptText?: string) {
    const textToSend = promptText || chatInput;
    if (!textToSend.trim() || sendingChat) return;

    const userMsg: GeminiMessage = { role: 'user', text: textToSend.trim() };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    if (!promptText) setChatInput('');
    setSendingChat(true);

    try {
      const answer = await askGeminiQuestion(result, textToSend.trim(), chatMessages, currentKey || undefined);
      setChatMessages([...newHistory, { role: 'model', text: answer }]);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to get AI response' });
    } finally {
      setSendingChat(false);
    }
  }

  const QUICK_QUESTIONS = [
    'Can I reverse this risk level with diet?',
    'What foods should I avoid with this glucose level?',
    'What specific tests should I ask my doctor for?',
    'Why does blood pressure affect diabetes risk?',
  ];

  return (
    <Card className="border-border/80 shadow-sm overflow-hidden bg-gradient-to-b from-card via-card to-muted/20">
      {/* Header */}
      <CardHeader className="p-4 sm:p-5 border-b bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  Google Gemini Dynamic Clinical Synthesis
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-2 py-0.5 font-medium border',
                    currentKey
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-primary/10 text-primary border-primary/20'
                  )}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {currentKey ? 'Live GenAI Active' : 'Gemini 1.5 Flash'}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                AI endocrinologist evaluation dynamically tailored to your exact metabolic biomarkers
              </CardDescription>
            </div>
          </div>

          {/* Key Management Button */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKeyModal((prev) => !prev)}
              className="h-8 text-xs gap-1.5 font-medium hover:border-primary/50"
            >
              <Key className="h-3.5 w-3.5 text-primary" />
              {currentKey ? 'API Key Configured' : 'Connect Gemini API Key'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadSynthesis(currentKey || undefined)}
              disabled={loadingSynthesis}
              className="h-8 w-8 p-0"
              title="Regenerate dynamic analysis"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loadingSynthesis && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* API Key Modal / Drawer */}
        {showKeyModal && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Google Gemini API Configuration
              </h4>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                Get Free API Key <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              Enter your Google AI Studio API key to enable live, streaming dynamic clinical synthesis and conversational medical Q&A with Gemini 1.5 Flash. The key is securely stored in your browser.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="text-xs font-mono"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={handleSaveKey}
                  disabled={testingKey}
                  className="text-xs gap-1.5"
                >
                  {testingKey ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {testingKey ? 'Validating...' : 'Save & Verify'}
                </Button>
                {currentKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      removeGeminiApiKey();
                      setCurrentKey(null);
                      setApiKeyInput('');
                      toast({ title: 'API Key Cleared' });
                    }}
                    className="text-xs text-destructive hover:bg-destructive/10"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic AI Analysis Content */}
        {loadingSynthesis ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <RefreshCw className="h-6 w-6 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-medium">
              Generating dynamic endocrinologist synthesis with Gemini AI...
            </p>
          </div>
        ) : synthesis ? (
          <div className="space-y-4">
            {/* Executive Summary */}
            <div className="rounded-xl border bg-card p-4 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
                <Stethoscope className="h-3.5 w-3.5" /> Clinical Executive Assessment
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {synthesis.summary}
              </p>
            </div>

            {/* Metabolic Mechanics & Physiological Rationale */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase">
                <Lightbulb className="h-3.5 w-3.5" /> Metabolic Risk Mechanics
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {synthesis.metabolicMechanics}
              </p>
            </div>

            {/* Grid: Physician Discussion & Lifestyle Priorities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Physician Discussion */}
              <div className="rounded-xl border bg-card p-4 space-y-2.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Physician Discussion Points
                </span>
                <ul className="space-y-2">
                  {synthesis.physicianDiscussionPoints.map((point, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="font-semibold text-primary mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lifestyle Priorities */}
              <div className="rounded-xl border bg-card p-4 space-y-2.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Target Metabolic Priorities
                </span>
                <ul className="space-y-2">
                  {synthesis.keyLifestylePriorities.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="font-semibold text-amber-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Engine Attribution Badge */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 px-1">
              <span>{synthesis.generatedBy}</span>
              {synthesis.isSimulatedFallback && (
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="text-primary hover:underline font-medium flex items-center gap-1"
                >
                  Connect API Key for Live GenAI <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ) : null}

        <Separator />

        {/* Interactive "Ask Dr. Gemini" Q&A Chat */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Ask Dr. Gemini About Your Results</h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChatOpen((prev) => !prev)}
              className="text-xs h-7 gap-1"
            >
              {chatOpen ? 'Hide Chat' : 'Open AI Doctor Chat'}
              {chatOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {chatOpen && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              {/* Quick Prompt Pills */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground font-medium">Suggested clinical questions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      disabled={sendingChat}
                      className="rounded-full border border-border/80 bg-muted/40 hover:bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Message Stream */}
              {chatMessages.length > 0 && (
                <div className="space-y-3 max-h-72 overflow-y-auto p-2 rounded-lg bg-muted/20 border border-border/40">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex gap-2.5 text-xs leading-relaxed rounded-xl p-3',
                        msg.role === 'user'
                          ? 'bg-primary/10 text-foreground ml-6 border border-primary/20'
                          : 'bg-card text-foreground mr-6 border border-border shadow-2xs'
                      )}
                    >
                      {msg.role === 'model' && (
                        <div className="h-6 w-6 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div className="space-y-1 flex-1">
                        <span className="font-semibold text-[10px] uppercase text-muted-foreground block">
                          {msg.role === 'user' ? 'You' : 'Dr. Gemini (AI Endocrinologist)'}
                        </span>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Ask a question about your glucose, diet, medications, or lab values..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  disabled={sendingChat}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim() || sendingChat}
                  className="gap-1.5 shrink-0"
                >
                  {sendingChat ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Ask
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
