import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Card, CardContent } from '../ui/card';
import { HelpCircle } from 'lucide-react';

/**
 * FAQSection Component
 * Clean professional FAQ section
 */
export const FAQSection: React.FC = () => {
  const faqs = [
    {
      question: 'Is this legal?',
      answer: '100% legal. We only send alerts based on publicly available market data from NSE India. You make all your own investment decisions.',
    },
    {
      question: 'Will I make money?',
      answer: 'We cannot guarantee profits. Our alerts help you spot buying opportunities when stocks dip. Your investment decisions and market conditions determine outcomes.',
    },
    {
      question: 'How accurate are alerts?',
      answer: '100% accurate on price movements. We track real NSE prices directly from the exchange. Alerts are triggered based on actual, verified price data.',
    },
    {
      question: 'What if I miss the alert?',
      answer: 'We send alerts through multiple channels (email, Telegram, SMS for PRO). Plus, you get a daily summary email and can check your dashboard anytime.',
    },
    {
      question: 'Do I need to monitor the app constantly?',
      answer: 'No! We monitor markets 24/7 so you don\'t have to. Just check your email or notifications when you receive an alert.',
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes! No lock-in contracts. Free tier is free forever. PRO can be cancelled anytime. We also offer a 7-day money-back guarantee.',
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border border-gray-200 bg-white shadow-sm">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">FAQ</span>
            </div>
            <h2 className="text-5xl font-bold tracking-tight sm:text-6xl text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Everything you need to know
            </p>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white border-2 border-gray-200 hover:border-gray-300 rounded-xl px-6 transition-all duration-300"
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-6 text-gray-900">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-6">
                  <p className="leading-relaxed">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Contact CTA */}
          <div className="mt-12 text-center">
            <Card className="border-2 border-gray-200 bg-white inline-block">
              <CardContent className="p-6">
                <p className="text-gray-600 mb-2">Still have questions?</p>
                <a href="mailto:support@marketcrashmonitor.com" className="text-blue-600 font-semibold hover:underline">
                  Contact our support team
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
