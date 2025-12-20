import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, MessageSquare, Copy, Check } from "lucide-react";
import type { CommentTemplate } from "@shared/schema";

const CATEGORIES = [
  { value: "positive", label: "Positive" },
  { value: "playful", label: "Playful" },
  { value: "sassy", label: "Sassy" },
  { value: "dramatic", label: "Dramatic" },
  { value: "appreciative", label: "Appreciative" },
  { value: "critics", label: "Critics" },
  { value: "custom", label: "Custom" },
];

const PLATFORMS = [
  { value: "", label: "All Platforms" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
];

export default function Templates() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommentTemplate | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "custom",
    platform: "",
    templates: "",
    isActive: true,
  });

  const { data: templates = [], isLoading } = useQuery<CommentTemplate[]>({
    queryKey: ["/api/templates", filterCategory],
    queryFn: () => fetch(`/api/templates${filterCategory && filterCategory !== "all" ? `?category=${filterCategory}` : ""}`).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/templates", {
      ...data,
      platform: data.platform || null,
      templates: data.templates.split("\n").filter(t => t.trim()),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Template created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CommentTemplate> }) => 
      apiRequest("PATCH", `/api/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
      toast({ title: "Template updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", category: "custom", platform: "", templates: "", isActive: true });
  };

  const handleEdit = (template: CommentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      platform: template.platform || "",
      templates: template.templates.join("\n"),
      isActive: template.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: {
          ...formData,
          platform: formData.platform || null,
          templates: formData.templates.split("\n").filter(t => t.trim()),
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCopy = (template: CommentTemplate) => {
    navigator.clipboard.writeText(template.templates.join("\n"));
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Templates copied to clipboard" });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      positive: "bg-green-500/10 text-green-500",
      playful: "bg-yellow-500/10 text-yellow-500",
      sassy: "bg-pink-500/10 text-pink-500",
      dramatic: "bg-purple-500/10 text-purple-500",
      appreciative: "bg-blue-500/10 text-blue-500",
      critics: "bg-red-500/10 text-red-500",
      custom: "bg-gray-500/10 text-gray-500",
    };
    return colors[category] || colors.custom;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Comment Templates</h1>
          <p className="text-muted-foreground">Create and manage custom comment templates</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40" data-testid="select-filter-category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingTemplate(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-template">
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Template Name</label>
                  <Input
                    placeholder="e.g., Positive Vibes Pack"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-template-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                      <SelectTrigger data-testid="select-template-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Platform</label>
                    <Select value={formData.platform} onValueChange={v => setFormData({ ...formData, platform: v })}>
                      <SelectTrigger data-testid="select-template-platform">
                        <SelectValue placeholder="All Platforms" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Comments (one per line)</label>
                  <Textarea
                    placeholder="Enter your comment templates, one per line..."
                    value={formData.templates}
                    onChange={e => setFormData({ ...formData, templates: e.target.value })}
                    rows={10}
                    className="font-mono text-sm"
                    data-testid="textarea-templates"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.templates.split("\n").filter(t => t.trim()).length} templates
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.name || !formData.templates.trim()}
                    data-testid="button-save-template"
                  >
                    {editingTemplate ? "Update" : "Create"} Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-6 bg-muted rounded w-32" /></CardHeader>
              <CardContent><div className="h-20 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first custom comment template to get started</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card key={template.id} className={!template.isActive ? "opacity-60" : ""} data-testid={`card-template-${template.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleCopy(template)} data-testid={`button-copy-${template.id}`}>
                      {copiedId === template.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(template)} data-testid={`button-edit-${template.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(template.id)} data-testid={`button-delete-${template.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className={getCategoryColor(template.category)}>
                    {template.category}
                  </Badge>
                  {template.platform && (
                    <Badge variant="outline">{template.platform}</Badge>
                  )}
                  <Badge variant="outline">{template.templates.length} comments</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {template.templates.slice(0, 3).map((t, i) => (
                    <p key={i} className="truncate">{t}</p>
                  ))}
                  {template.templates.length > 3 && (
                    <p className="text-xs">+{template.templates.length - 3} more...</p>
                  )}
                </div>
                {template.usageCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Used {template.usageCount} times
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
