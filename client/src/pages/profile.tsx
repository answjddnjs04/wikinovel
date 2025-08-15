import React, { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { ArrowLeft, Camera } from "lucide-react";
import { Link } from "wouter";

const profileSchema = z.object({
  firstName: z.string().min(1, "닉네임을 입력해주세요").max(50, "닉네임은 50자 이내로 입력해주세요"),
  profileImageUrl: z.string().url("올바른 이미지 URL을 입력해주세요").optional().or(z.literal(""))
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!user
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      profileImageUrl: ""
    }
  });

  // Reset form when user data loads
  useEffect(() => {
    if (userProfile) {
      form.reset({
        firstName: (userProfile as any)?.firstName || "",
        profileImageUrl: (userProfile as any)?.profileImageUrl || ""
      });
    }
  }, [userProfile, form]);

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error("프로필 업데이트에 실패했습니다");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "프로필 업데이트 완료",
        description: "프로필이 성공적으로 업데이트되었습니다."
      });
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

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-slate-600">로그인이 필요합니다.</p>
          <Link href="/landing">
            <Button className="mt-4" data-testid="button-login">로그인하기</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로가기
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-800" data-testid="text-page-title">프로필 설정</h1>
        </div>

        <Card data-testid="card-profile">
          <CardHeader>
            <CardTitle>내 프로필</CardTitle>
            <CardDescription>
              닉네임과 프로필 사진을 변경할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile Image Section */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24" data-testid="avatar-profile">
                      <AvatarImage 
                        src={form.watch("profileImageUrl") || (userProfile as any)?.profileImageUrl} 
                        alt="프로필 사진"
                      />
                      <AvatarFallback className="text-xl">
                        {(userProfile as any)?.firstName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 bg-slate-800 rounded-full p-2">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="profileImageUrl"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>프로필 이미지 URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/image.jpg"
                            {...field}
                            data-testid="input-profile-image"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Name Section */}
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>닉네임</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="닉네임을 입력하세요"
                          {...field}
                          data-testid="input-nickname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Current Info Display */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-medium text-slate-700 mb-2">현재 정보</h3>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p data-testid="text-current-nickname">닉네임: {(userProfile as any)?.firstName}</p>
                    <p data-testid="text-current-email">이메일: {(userProfile as any)?.email || "설정되지 않음"}</p>
                    <p data-testid="text-login-provider">로그인 방식: {(userProfile as any)?.provider || "Replit"}</p>
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={updateProfile.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfile.isPending ? "저장 중..." : "프로필 저장"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}