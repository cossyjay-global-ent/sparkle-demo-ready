import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  MessageCircle, 
  Mail, 
  HelpCircle, 
  ChevronDown,
  Send,
  CheckCircle
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

const Support = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const faqs = [
    {
      question: 'How does offline mode work?',
      answer: 'All your data is stored locally on your device. When you have internet, your data automatically syncs to the cloud. You can use all features without internet connection.'
    },
    {
      question: 'How do I record a sale?',
      answer: 'Go to Dashboard > Sales, click "Record Sale", select a product or enter details manually, set the quantity and price, then save. The sale is recorded instantly.'
    },
    {
      question: 'Can I manage customer debts?',
      answer: 'Yes! Go to the Debts section to record and track customer debts. You can add payments, set due dates, and view outstanding balances for each customer.'
    },
    {
      question: 'How do I add products?',
      answer: 'Navigate to Products, click "Add Product", enter the product name, cost price, selling price, and initial stock quantity. Products are available immediately for sales.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes. Your data is encrypted and stored securely. Only you can access your business data through your account credentials.'
    },
    {
      question: 'How do I install the app on my phone?',
      answer: 'Visit the Install page from the menu. On Android, tap "Install App" when prompted. On iOS, tap the Share button and select "Add to Home Screen".'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to a support system
    setIsSubmitted(true);
    toast.success('Message sent successfully!');
    setName('');
    setEmail('');
    setMessage('');
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">Help & Support</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <section className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">How can we help?</h2>
          <p className="text-muted-foreground">
            Find answers to common questions or send us a message
          </p>
        </section>

        {/* FAQ Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Frequently Asked Questions</h3>
          </div>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <Collapsible key={index}>
                <Card className="card-glass">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-left">
                          {faq.question}
                        </CardTitle>
                        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </section>

        {/* Contact Form */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Send us a Message</h3>
          </div>
          <Card className="card-glass">
            <CardContent className="pt-6">
              {isSubmitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <h4 className="text-lg font-semibold">Message Sent!</h4>
                  <p className="text-muted-foreground">
                    We'll get back to you as soon as possible.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="input-styled"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="input-styled"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Describe your issue or question..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      rows={5}
                      className="input-styled resize-none"
                    />
                  </div>
                  <Button type="submit" className="w-full btn-primary-gradient">
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Support;