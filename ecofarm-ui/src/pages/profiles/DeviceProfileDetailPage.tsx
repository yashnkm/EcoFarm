import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"

import { deviceProfilesApi } from "@/api/deviceProfiles"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PollGroupsTab } from "./tabs/PollGroupsTab"
import { DataPointsTab } from "./tabs/DataPointsTab"
import { CommandsTab } from "./tabs/CommandsTab"

export function DeviceProfileDetailPage() {
  const { id = "" } = useParams<{ id: string }>()

  const { data: profile, isLoading } = useQuery({
    queryKey: ["device-profile", id],
    queryFn: () => deviceProfilesApi.get(id),
    enabled: !!id,
  })

  return (
    <div className="flex flex-col gap-6">
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
