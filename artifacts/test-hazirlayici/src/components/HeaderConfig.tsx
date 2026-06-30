import { HeaderConfig } from '@/lib/db';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

interface HeaderConfigProps {
  config: HeaderConfig;
  onChange: (config: HeaderConfig) => void;
}

export default function HeaderConfigPanel({ config, onChange }: HeaderConfigProps) {
  const handleChange = (key: keyof HeaderConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="p-4 bg-white border rounded-md shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <Label htmlFor="header-enabled" className="text-base font-semibold">Başlık Bölümünü Etkinleştir</Label>
        <Switch 
          id="header-enabled" 
          checked={config.enabled} 
          onCheckedChange={(val) => handleChange('enabled', val)} 
        />
      </div>

      {config.enabled && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <div>
            <Label htmlFor="test-title">Test Başlığı</Label>
            <Input 
              id="test-title" 
              value={config.testTitle} 
              onChange={(e) => handleChange('testTitle', e.target.value)} 
              placeholder="Örn: 2024-2025 Matematik 1. Dönem 1. Yazılı"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-name" 
                checked={config.showName} 
                onCheckedChange={(val) => handleChange('showName', !!val)} 
              />
              <Label htmlFor="show-name">Ad Soyad</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-class" 
                checked={config.showClass} 
                onCheckedChange={(val) => handleChange('showClass', !!val)} 
              />
              <Label htmlFor="show-class">Sınıf</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-number" 
                checked={config.showNumber} 
                onCheckedChange={(val) => handleChange('showNumber', !!val)} 
              />
              <Label htmlFor="show-number">Numara</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-date" 
                checked={config.showDate} 
                onCheckedChange={(val) => handleChange('showDate', !!val)} 
              />
              <Label htmlFor="show-date">Tarih</Label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
