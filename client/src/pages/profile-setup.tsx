import React, { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import { useLocation } from "wouter";

const profileSchema = z.object({
  firstName: z.string().min(1, "닉네임을 입력해주세요").max(50, "닉네임은 50자 이내로 입력해주세요")
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileSetup() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: (user as any)?.firstName || ""
    }
  });

  // Initialize form with current user data
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: (user as any)?.firstName || ""
      });
    }
  }, [user, form]);

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "프로필 업데이트에 실패했습니다");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "환영합니다!",
        description: "프로필 설정이 완료되었습니다. 위키노벨을 시작해보세요!"
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data);
  };

  const skipSetup = () => {
    setLocation("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="border-0 shadow-xl" data-testid="card-profile-setup">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-slate-800">위키노벨에 오신 것을 환영합니다!</CardTitle>
              <CardDescription className="text-slate-600 mt-2">
                카카오 로그인이 완료되었습니다.<br />
                사용하실 닉네임을 설정해주세요.
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Profile Preview */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-20 w-20" data-testid="avatar-preview">
                <AvatarImage 
                  src={(user as any)?.profileImageUrl} 
                  alt="프로필 사진"
                />
                <AvatarFallback className="text-lg bg-gradient-to-r from-purple-100 to-blue-100">
                  {(user as any)?.firstName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-slate-600 text-center">카카오 프로필 사진</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">닉네임</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="사용하실 닉네임을 입력하세요"
                          className="h-12 border-slate-200 focus:border-purple-500"
                          {...field}
                          data-testid="input-nickname-setup"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    disabled={updateProfile.isPending}
                    data-testid="button-complete-setup"
                  >
                    {updateProfile.isPending ? "설정 중..." : "시작하기"}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="w-full text-slate-600 hover:text-slate-800"
                    onClick={skipSetup}
                    data-testid="button-skip-setup"
                  >
                    나중에 설정하기
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}