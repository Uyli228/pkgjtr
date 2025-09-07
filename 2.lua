--// Config
getgenv().webhook = "YOUR_WEBHOOK_HERE"

getgenv().TargetPetNames = {
    "Graipuss Medussi",
    "La Grande Combination",
    "Nuclearo Dinossauro",
    "Garama and Madundung",
    "Pot Hotspot",
    "Chicleteira Bicicleteira",
    "Los Combinasionas",
    "Dragon Cannelloni",
    "Los Hotspotsitos",
    "Los Nooo My Hotspotsitos",
    "Spaghetti Tualetti",
    "La Vacca Saturno Saturnita",
}

--// Services
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local TeleportService = game:GetService("TeleportService")

local LocalPlayer
repeat LocalPlayer = Players.LocalPlayer task.wait() until LocalPlayer

--// State
local webhook = getgenv().webhook or ""
local targetPets = getgenv().TargetPetNames or {}
local visitedJobIds = { [game.JobId] = true }
local hops, maxHopsBeforeReset, teleportFails, maxTeleportRetries = 0, 50, 0, 3
local detectedPets, webhookSent, stopHopping = {}, false, false

--// ESP
local function addESP(targetModel)
    if targetModel:FindFirstChild("PetESP") then return end
    local Billboard = Instance.new("BillboardGui")
    Billboard.Name = "PetESP"
    Billboard.Adornee = targetModel
    Billboard.Size = UDim2.new(0, 100, 0, 30)
    Billboard.StudsOffset = Vector3.new(0, 3, 0)
    Billboard.AlwaysOnTop = true
    Billboard.Parent = targetModel

    local Label = Instance.new("TextLabel")
    Label.Size = UDim2.new(1, 0, 1, 0)
    Label.BackgroundTransparency = 1
    Label.Text = "TARGET PET"
    Label.TextColor3 = Color3.fromRGB(255, 0, 0)
    Label.TextStrokeTransparency = 0.5
    Label.Font = Enum.Font.SourceSansBold
    Label.TextScaled = true
    Label.Parent = Billboard
end

--// Webhook
local function sendWebhook(foundPets, jobId, disappeared)
    if webhook == "" then return end

    local title, description, color, mention = "", "", 0xFF0000, "@everyone"
    if disappeared then
        title = "PET(s) DISAPPEARED"
        description = "Target pet(s) no longer found in this server."
        color = 0xFFA500
        mention = ""
    else
        title = "PET(s) FOUND"
        description = "Target pet(s) detected in this server!"
        color = 0xFF0000
    end

    -- custom join link
    local joinLink = string.format(
        "https://braintopia-auto.pneed100.workers.dev/?placeID=%d&gameInstanceId=%s",
        game.PlaceId,
        jobId
    )

    local jsonData = HttpService:JSONEncode({
        ["content"] = mention,
        ["embeds"] = {{
            ["title"] = title,
            ["description"] = description,
            ["fields"] = {
                { ["name"] = "User", ["value"] = LocalPlayer.Name },
                { ["name"] = "Pet(s)", ["value"] = table.concat(foundPets, "\n") },
                { ["name"] = "Join Link", ["value"] = joinLink },
                { ["name"] = "Server JobId", ["value"] = jobId },
                { ["name"] = "Time", ["value"] = os.date("%Y-%m-%d %H:%M:%S") },
            },
            ["color"] = color,
        }}
    })

    local req = http_request or request or syn and syn.request
    if req then
        pcall(function()
            req({
                Url = webhook,
                Method = "POST",
                Headers = { ["Content-Type"] = "application/json" },
                Body = jsonData,
            })
        end)
    end
end

--// Pet detection
local function checkForPets()
    local found = {}
    for _, obj in pairs(workspace:GetDescendants()) do
        if obj:IsA("Model") then
            local nameLower = string.lower(obj.Name)
            for _, target in pairs(targetPets) do
                if string.find(nameLower, string.lower(target)) and not obj:FindFirstChild("PetESP") then
                    addESP(obj)
                    table.insert(found, obj.Name)
                    stopHopping = true
                    break
                end
            end
        end
    end
    return found
end

--// Server hop
local function serverHop()
    if stopHopping then return end
    task.wait(1.5)

    local cursor, PlaceId, JobId, tries = nil, game.PlaceId, game.JobId, 0
    hops += 1
    if hops >= maxHopsBeforeReset then
        visitedJobIds = { [JobId] = true }
        hops = 0
    end

    while tries < 3 do
        local url = "https://games.roblox.com/v1/games/" .. PlaceId .. "/servers/Public?sortOrder=Asc&limit=100"
        if cursor then url = url .. "&cursor=" .. cursor end

        local success, response = pcall(function()
            return HttpService:JSONDecode(game:HttpGet(url))
        end)

        if success and response and response.data then
            local servers = {}
            for _, server in ipairs(response.data) do
                if tonumber(server.playing or 0) < tonumber(server.maxPlayers or 1)
                    and server.id ~= JobId
                    and not visitedJobIds[server.id]
                then
                    table.insert(servers, server.id)
                end
            end

            if #servers > 0 then
                local picked = servers[math.random(1, #servers)]
                visitedJobIds[picked] = true
                teleportFails = 0
                TeleportService:TeleportToPlaceInstance(PlaceId, picked)
                return
            end

            cursor = response.nextPageCursor
            if not cursor then
                tries += 1
                cursor = nil
                task.wait(0.5)
            end
        else
            tries += 1
            task.wait(0.5)
        end
    end

    TeleportService:Teleport(PlaceId)
end

--// Periodic recheck
task.spawn(function()
    while true do
        task.wait(30)
        if next(detectedPets) ~= nil then
            local vanished = {}
            for petName, _ in pairs(detectedPets) do
                local stillExists = false
                for _, obj in pairs(workspace:GetDescendants()) do
                    if obj:IsA("Model") and string.lower(obj.Name) == string.lower(petName) then
                        stillExists = true
                        break
                    end
                end
                if not stillExists then
                    table.insert(vanished, petName)
                    detectedPets[petName] = nil
                end
            end
            if #vanished > 0 then
                sendWebhook(vanished, game.JobId, true)
            end
            if next(detectedPets) == nil then
                stopHopping = false
                webhookSent = false
                task.delay(1.5, serverHop)
            end
        end
    end
end)

--// Live detection
workspace.DescendantAdded:Connect(function(obj)
    task.wait(0.25)
    if obj:IsA("Model") then
        local nameLower = string.lower(obj.Name)
        for _, target in pairs(targetPets) do
            if string.find(nameLower, string.lower(target)) and not obj:FindFirstChild("PetESP") then
                if not detectedPets[obj.Name] then
                    detectedPets[obj.Name] = true
                    addESP(obj)
                    stopHopping = true
                    if not webhookSent then
                        sendWebhook({obj.Name}, game.JobId, false)
                        webhookSent = true
                    end
                end
                break
            end
        end
    end
end)

--// Start
task.wait(6)
local petsFound = checkForPets()
if #petsFound > 0 then
    for _, name in ipairs(petsFound) do
        detectedPets[name] = true
    end
    if not webhookSent then
        sendWebhook(petsFound, game.JobId, false)
        webhookSent = true
    end
else
    task.delay(1.5, serverHop)
end
