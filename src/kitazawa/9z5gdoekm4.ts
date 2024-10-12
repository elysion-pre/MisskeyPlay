/// @ 0.19.0
// 人気のノート(仮)
// Copyright (c) 2024 @elysion
// This script is licensed under the MIT
// https://opensource.org/licenses/mit-license.php

let PLAY_URL = if exists THIS_URL THIS_URL else `{SERVER_URL}/play/`
let PLAY_TAG = "#人気のノート(仮)"

// ユーザーデータ
// param: id<str>
@User(id) {
  let this = {
    // コンストラクタ
    // param: id<str>
    constructor: @(id) {
      this.user = Mk:api("users/show", {
        userId: id
      })
      this
    }
    // 名前取得
    // nameが未入力ならusernameを返す
    // return: <str>
    getName: @() { if this.user.name == null return this.user.username else return this.user.name }
    // メンション名取得(@username@host)
    // return: <str>
    getMentionName: @() {
      match this.user.host {
        null => { return `@{this.user.username}` }
        * => { return `@{this.user.username}@{this.user.host}` }
      }
    }
    // プロフィールURL取得
    // return: <str>
    getProfileURL: @() {
      match this.host {
        null => { return `{SERVER_URL}/@{this.user.username}` }
        * => { return `https://{this.user.host}/@{this.user.username}` }
      }
    }
    // ノート数取得
    // return: <num>
    getNotesCount: @() { this.user.notesCount }
    // ノート取得
    // param: limit<num>
    // return: <arr>
    getNotes: @(limit) {
      let func = @(limit, params) {
        if (params.limit <= 0) {
          return []
        }
        let notes = Mk:api("users/notes", params)
        if (notes.len < params.limit) {
          return notes
        }
        limit -= params.limit
        return notes.concat(func(limit, {
          userId: this.user.id,
          withChannelNotes: params.withChannelNotes,
          limit: Math:min(limit, 100),
          untilId: notes[notes.len - 1].id
        }))
      }
      return func(limit, {
        userId: this.user.id,
        withChannelNotes: true,
        limit: Math:min(limit, 100)
      })
    }
    // 今日のノート取得
    // param: limit<num>
    // return: <arr>
    getTodayNotes: @() {
      var notes = Mk:api("users/notes", {
        userId: this.user.id,
        withChannelNotes: true,
        limit: 100
      }).filter(@(i) {
        Date:year(Date:parse(i.createdAt)) == Date:year(Date:now()) && Date:month(Date:parse(i.createdAt)) == Date:month(Date:now()) && Date:day(Date:parse(i.createdAt)) == Date:day(Date:now())
      })
      if (notes.len < 100) return notes

      loop {
        let add_notes = Mk:api("users/notes", {
          userId: this.user.id,
          withChannelNotes: true,
          limit: 100,
          untilId: notes[notes.len - 1].id
        }).filter(@(i) {
          Date:year(Date:parse(i.createdAt)) == Date:year(Date:now()) && Date:month(Date:parse(i.createdAt)) == Date:month(Date:now()) && Date:day(Date:parse(i.createdAt)) == Date:day(Date:now())
        })
        notes = notes.concat(add_notes)
        if add_notes.len < 100 break
      }
      notes
    }
    // idが自分かどうか
    // param: id<str>
    // return: <bool>
    isYourself: @(id) { if this.user.id == id return true else return false }
  }
  this.constructor(id)
}

@Game() {
  // ユーザーデータ
  var user = null
  // リアクションリスト
  var reaction_list = null
  // リアクション検索フラグ
  var fSearchAll = false

  // 初期化
  @init() {
    if (USER_ID == null) {
      render([
        Ui:C:container({
          children: [
            Ui:C:mfm({
              text: `$[x4 :GoBack:]`
            })
          ]
          align: "center"
        })
      ])
      Mk:dialog("エラー", [
        `ユーザーIDが見つかりませんでした`
        `$[x2 :fushiginakotomoarumondesuna::mimi_hate:]`
        `ログインしてから遊んでみてねー👋`
      ].join(Str:lf), "error")
    } else {
      user = User(USER_ID)
//<:`user: {user}`
      exec()
    }
  }
  // 実行
  @exec() {
    let info_text = if fSearchAll `全て` else `今日`

    render([
      Ui:C:container({
        children: [
          Ui:C:mfm({
            text: [
              `$[x2 Now Loading]`
              `{info_text}のノートへのリアクションを取得中$[bounce .]$[bounce.delay=0.2s .]$[bounce.delay=0.4s .]`
//              `<small>⚠️他サーバーから送られたのカスタム絵文字は除外</small>`
            ].join(Str:lf)
          })
        ]
        align: "center"
      })
    ])

    // リアクションがあるノートのリアクションを取得
    let notes_reactions = eval {
      if fSearchAll {
        user.getNotes(user.getNotesCount()).filter(@(i) {
          i.reactionCount > 0
        })
      } else {
        user.getTodayNotes().filter(@(i) {
          i.reactionCount > 0
        })
      }
    }
<:`notes_reactions: {notes_reactions[0]}`

    let reaction_notes_count = notes_reactions.len

    if reaction_notes_count == 0 {
      // 結果表示用
      let resultMfm = [
        `{user.getName()}の`
        `今日もらったリアクションはありませんでした。`
      ].join(Str:lf)
      
      render([
        Ui:C:container({
          children: [
            Ui:C:mfm({
              text: [
                resultMfm
              ].join(Str:lf)
            })
          ]
          align: "center"
        })
        Ui:C:container({
          children: [
            Ui:C:folder({
              children: [
                Ui:C:container({
                  children: [
                    Ui:C:button({
                      text: "もう一度(全てのノートを対象)"
                      onClick: @() {
                        reaction_disp_mode = 0
                        fSearchAll = true
                        exec()
                      }
                      primary: true
                    })
                    Ui:C:mfm({
                      text: [
                        "<small>⚠️ノート数に応じて読み込みに時間が必要になります。"
                        "エラーが出るかもしれません。自己責任で。</small>"
                      ].join(Str:lf)
                    })
                  ]
                  padding: 5
                })
              ]
              title: "おまけ"
              opened: true
            })
          ]
          align: "center"
        })
      ])

      Mk:dialog("エラー", [
        `今日のノートが見つかりませんでした`
        `$[x2 :kanashiiyo::mimi_hate:]`
        `投稿してリアクションもらえるといいね！`
      ].join(Str:lf), "error")
    } else {
      render([
        Ui:C:container({
          children: [
            Ui:C:mfm({
              text: [
                `$[x2 Now Loading]`
                `リアクションの値でソート中$[bounce .]$[bounce.delay=0.2s .]$[bounce.delay=0.4s .]`
                `<small>{reaction_notes_count}件のノートを対象に集計を行っています</small>`
              ].join(Str:lf)
            })
          ]
          align: "center"
        })
      ])

      reaction_list = notes_reactions.map(@(v) {
        [ v.id, v.createdAt, v.reactionCount, v.renoteCount, v.text, v.fileIds ]
      }).sort(@(a, b) {
        (b[2] - a[2])
      })
//<:`reaction_list: {reaction_list}`

      main()
    }
  }
  // メイン処理
  @main() {
    let info_text = if fSearchAll `今まで` else `今日`

    render([
      Ui:C:container({
        children: [
          Ui:C:mfm({
            text: [
              `$[x2 Now Loading]`
              `結果描画中$[bounce .]$[bounce.delay=0.2s .]$[bounce.delay=0.4s .]`
            ].join(Str:lf)
          })
        ]
        align: "center"
      })
    ])

    let rank_emoji = [
      "🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"
    ]
    let folder_components = []
    for (let i = 0, reaction_list.len) {
      if i == rank_emoji.len break
      folder_components.push(
        Ui:C:folder({
          children: [
            Ui:C:mfm({
              text: [
                `ノート内容`
                `{reaction_list[i][4]}`
                `ファイル数`
                `{reaction_list[i][5].len}`
                `ノートへのリンク`
                `{SERVER_URL}/notes/{reaction_list[i][0]}`
                `リアクション数`
                `{reaction_list[i][2]}`
                `リノート数`
                `{reaction_list[i][3]}`
                `<small>$[unixtime {Date:parse(reaction_list[i][1]) / 1000}]</small>`
              ].join(Str:lf)
            })
          ]
          title: `{rank_emoji[i]}: {reaction_list[i][2]}リアクション`
        })
      )
    }

    // 結果表示用
    let resultMfm = [
      `{user.getName()}の`
      `{info_text}もらったリアクションが多いノートは`
    ].join(Str:lf)

    render([
      Ui:C:container({
        children: [
          Ui:C:mfm({
            text: resultMfm
          })
        ]
        align: "center"
      })
      Ui:C:container({
        children: folder_components
        align: "center"
      })
      Ui:C:container({
        children: [
          Ui:C:folder({
            children: [
              Ui:C:container({
                children: [
                  Ui:C:button({
                    text: "もう一度(全てのノートを対象)"
                    onClick: @() {
                      fSearchAll = true
                      exec()
                    }
                    primary: true
                  })
                  Ui:C:mfm({
                    text: [
                      "<small>⚠️ノート数に応じて読み込みに時間が必要になります。"
                      "エラーが出るかもしれません。自己責任で。</small>"
                    ].join(Str:lf)
                  })
                ]
                padding: 5
              })
            ]
            title: "おまけ"
            opened: true
          })
        ]
        align: "center"
      })
    ])
  }
  @render(components) {
    Ui:render(components)
  }
  init()
}
Game()
