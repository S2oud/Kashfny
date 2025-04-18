'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Card from '@/components/Card';
import Button from '@/components/Button';

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Prevent hydration errors
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card className="bg-gradient-to-br from-white to-gray-50 shadow-lg border border-gray-100">
        <Header 
          title="كاشفني / داقشني"
          subtitle="تطبيق حساب النقاط للعبة الورق"
        />
        
        <div className="space-y-4 mt-6">
          <Button 
            href="/setup" 
            variant="primary"
            fullWidth
            className="py-4 text-lg shadow-md hover:shadow-lg transition-all"
          >
            بدء لعبة جديدة
          </Button>
          
          <Button 
            href="/about" 
            variant="secondary"
            fullWidth
          >
            حول التطبيق
          </Button>
        </div>
      </Card>
    </main>
  );
}
