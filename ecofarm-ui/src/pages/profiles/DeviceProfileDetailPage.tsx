import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Download, Upload } from "lucide-react"

import { deviceProfilesApi } from "@/api/deviceProfiles"
import { profileImportExportApi } from "@/api/profileImportExport"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PollGroupsTab } from "./tabs/PollGroupsTab"
import { DataPointsTab } from "./tabs/DataPointsTab"
import { CommandsTab } from "./tabs/CommandsTab"
import { ImportDialog } from "./ImportDialog"

export function DeviceProfileDetailPage() {
  const { id = "" } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "TENANT_ADMIN"
  const [importOpen, setImportOpen] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ["device-profile", id],
    queryFn: () => deviceProfilesApi.get(id),
    enabled: !!id,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/profiles" />}>
            <ArrowLeft data-icon="inline-start" />
            Back to profiles
          </Button>

          <div className="mt-4">
            <h1 className="text-2xl font-semibold">{profile?.name ?? (isLoading ? "Loading…" : "—")}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              {profile?.manufacturer && <span>{profile.manufacturer}</span>}
              {profile?.model && <span>· {profile.model}</span>}
              {profile && (
                <>
                  <Badge variant="secondary">{profile.category.replace("_", " ")}</Badge>
                  <Badge variant={profile.global ? "default" : "outline"}>
                    {profile.global ? "Global" : "Tenant"}
                  </Badge>
                </>
              )}
            </div>
            {profile?.description && (
              <p className="mt-2 text-sm text-muted-foreground">{profile.description}</p>
            )}
          </div>
        </div>

        {profile && (
          <div className="mt-1 flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => profileImportExportApi.export(profile.id, profile.name)}
            >
              <Download data-icon="inline-start" />
              Export
            </Button>
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload data-icon="inline-start" />
                Import
              </Button>
            )}
          </div>
        )}
      </div>

      {profile && (
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          targetProfileId={profile.id}
          targetProfileName={profile.name}
          onImported={() => queryClient.invalidateQueries({ queryKey: ["device-profile", id] })}
        />
      )}

      <Tabs defaultValue="poll-groups">
        <TabsList>
          <TabsTrigger value="poll-groups">Poll Groups</TabsTrigger>
          <TabsTrigger value="data-points">Data Points</TabsTrigger>
          <TabsTrigger value="commands">Commands</TabsTrigger>
        </TabsList>
        <TabsContent value="poll-groups"><PollGroupsTab profileId={id} /></TabsContent>
        <TabsContent value="data-points"><DataPointsTab profileId={id} /></TabsContent>
        <TabsContent value="commands"><CommandsTab profileId={id} /></TabsContent>
      </Tabs>
    </div>
  )
}
