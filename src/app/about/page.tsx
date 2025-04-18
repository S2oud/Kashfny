'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Card from '@/components/Card';
import Button from '@/components/Button';

export default function About() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Prevent hydration errors
  }

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card className="bg-gradient-to-br from-white to-gray-50 shadow-lg border border-gray-100">
        <Header 
          title="حول التطبيق"
          showBackButton
          backUrl="/"
        />
        
        <div className="space-y-4">
          <p className="text-gray-700">
            تطبيق حساب نقاط لعبة "كاشفني/داقشني" هو أداة بسيطة وفعالة لتتبع نقاط اللاعبين أثناء اللعب. يمكنك استخدام هذا التطبيق لـ:
          </p>
          
          <ul className="list-disc list-inside space-y-2 text-gray-700 pr-4">
            <li>تحديد المبلغ الابتدائي لكل لاعب</li>
            <li>إضافة وإدارة اللاعبين</li>
            <li>تسجيل النقاط بعد كل جولة</li>
            <li>عرض سجل النقاط والجولات السابقة</li>
            <li>إعادة ضبط اللعبة أو إنهائها</li>
          </ul>
          
          <p className="text-gray-700">
            يعمل التطبيق بدون إنترنت ويحفظ البيانات محلياً على جهازك، مما يتيح لك استخدامه في أي مكان.
          </p>
          
          <div className="pt-4">
            <Button
              href="/"
              variant="secondary"
              fullWidth
            >
              العودة للصفحة الرئيسية
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
